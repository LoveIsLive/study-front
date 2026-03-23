import React, { useState, useEffect, useCallback } from 'react';
import { classesApi, schoolApi, schoolMemberApi } from '../../../services/api';
import useAuthStore from '../../../store/authStore';
import Swal from 'sweetalert2';
import ClassCard from './ClassCard';
import ClassModal from './ClassModal';
import ClassDetailView from './ClassDetailView';
import SchoolModal from './SchoolModal';
import AddPrincipalModal from './AddPrincipalModal';
import MemberTable from './MemberTable';
import Modal from '../../../components/common/Modal/Modal';
import Spinner from '../../../components/common/Spinner/Spinner';
import styles from '../OrganizationPage.module.css';
import adminStyles from './AdminView.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSchool, faArrowLeft, faUsersCog, faSearch } from '@fortawesome/free-solid-svg-icons';

// ... SchoolCard 组件保持不变 ...
const SchoolCard = ({ school, onSelect, onEdit, onDelete, onManageMembers }) => {
    return (
        <div className={adminStyles.schoolCard} onClick={onSelect}>
            <div className={adminStyles.cardHeader}>
                <h3 className={adminStyles.cardTitle}>
                    <FontAwesomeIcon icon={faSchool} className={adminStyles.schoolIcon} />
                    {school.name}
                </h3>
            </div>
            <div className={adminStyles.cardBody}>
                <span>{school.classCount || 0} 个班级</span>
            </div>
            <div className={adminStyles.cardActions}>
                <button onClick={(e) => { e.stopPropagation(); onManageMembers(school); }} className="btn btn-sm btn-secondary" title="管理负责人">
                    <FontAwesomeIcon icon={faUsersCog} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onEdit(school); }} className="btn btn-sm btn-primary">编辑</button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(school); }} className="btn btn-sm btn-danger">删除</button>
            </div>
        </div>
    );
};

const AdminView = () => {
    const { user } = useAuthStore();
    const isAdmin = useAuthStore((state) => state.isAdmin());
    const [isLoading, setIsLoading] = useState(false);

    const [currentView, setCurrentView] = useState(isAdmin ? 'schools' : 'classes');
    const [currentSchool, setCurrentSchool] = useState(null);
    const [currentClass, setCurrentClass] = useState(null);

    const [schools, setSchools] = useState([]);
    const [classes, setClasses] = useState([]);

    const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const [isPrincipalModalOpen, setIsPrincipalModalOpen] = useState(false);
    const [isAddPrincipalOpen, setIsAddPrincipalOpen] = useState(false);
    const [schoolPrincipals, setSchoolPrincipals] = useState([]);
    const [managingSchool, setManagingSchool] = useState(null);

    // --- 新增：搜索状态 ---
    const [schoolSearchTerm, setSchoolSearchTerm] = useState('');
    const [classSearchTerm, setClassSearchTerm] = useState('');

    // --- 加载数据 (已支持搜索) ---
    const fetchSchools = useCallback(async (key = '') => {
        setIsLoading(true);
        try {
            // 根据是否有 key 决定调用哪个接口
            const endpoint = key ? '/search' : '/all';
            const params = key ? { key } : {};

            const res = await schoolApi.get(endpoint, { params });
            setSchools(res.data.data || []);
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载学校失败' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchClasses = useCallback(async (schoolId, key = '') => {
        setIsLoading(true);
        try {
            const params = { detailed: true };
            if (schoolId) params.schoolId = schoolId;
            if (key) params.key = key;

            // 后端 ClassesController 已支持 /search?key=...&schoolId=...
            const endpoint = key ? '/search' : '/all';

            const res = await classesApi.get(endpoint, { params });
            setClasses(res.data.data || []);
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载班级失败' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchPrincipals = useCallback(async (schoolId) => {
        try {
            const res = await schoolMemberApi.get(`/${schoolId}/list`);
            setSchoolPrincipals(res.data.data || []);
        } catch (error) {
            console.error("fetch principals error", error);
        }
    }, []);

    // 初始加载
    useEffect(() => {
        if (currentView === 'schools' && isAdmin) {
            fetchSchools(); // 初始加载所有学校
        } else if (currentView === 'classes') {
            fetchClasses(currentSchool?.id); // 初始加载班级
        }
    }, [currentView, currentSchool, isAdmin, fetchSchools, fetchClasses]);

    // --- 搜索处理器 ---
    const handleSchoolSearch = () => {
        fetchSchools(schoolSearchTerm);
    };

    const handleClassSearch = () => {
        // 如果是 Admin, schoolId 存在；如果是 Principal, schoolId 为 null (由后端处理)
        fetchClasses(currentSchool?.id, classSearchTerm);
    };

    // --- 保持原有的 CRUD 方法 (handleSaveSchool, handleDeleteSchool, etc.) ---
    // ... 为了简洁，省略重复代码，请保留原有逻辑 ...
    const handleSaveSchool = async (data) => {
        try {
            if (editingItem) {
                await schoolApi.put(`/${editingItem.id}`, data);
            } else {
                await schoolApi.post('/create', data);
            }
            setIsSchoolModalOpen(false);
            fetchSchools();
            Swal.fire({ icon: 'success', title: '操作成功', timer: 1000, showConfirmButton: false });
        } catch (error) {
            Swal.fire({ icon: 'error', title: '操作失败', text: error.response?.data?.message });
        }
    };

    const handleDeleteSchool = async (school) => {
        const res = await Swal.fire({
            title: `删除 ${school.name}?`,
            text: "这将删除该学校下的所有班级、成员和数据，极为危险！",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: '确定删除'
        });
        if (res.isConfirmed) {
            try {
                await schoolApi.delete(`/${school.id}`);
                fetchSchools();
                Swal.fire('已删除', '', 'success');
            } catch (error) {
                Swal.fire('删除失败', error.response?.data?.message, 'error');
            }
        }
    };

    const handleManagePrincipals = (school) => {
        setManagingSchool(school);
        fetchPrincipals(school.id);
        setIsPrincipalModalOpen(true);
    };

    const handleAddPrincipal = async (data) => {
        try {
            const res = await schoolMemberApi.post(`/${managingSchool.id}/add`, data);
            const feedbacks = res.data.data;

            setIsAddPrincipalOpen(false);
            fetchPrincipals(managingSchool.id);

            if (feedbacks && feedbacks.length > 0) {
                Swal.fire({
                    title: '添加成功（用户名已调整）',
                    html: `<div style="text-align:left">${feedbacks.join('<br>')}</div>`,
                    icon: 'warning'
                });
            } else {
                Swal.fire({ icon: 'success', title: '添加成功', timer: 1000, showConfirmButton: false });
            }
        } catch (error) {
            Swal.fire('添加失败', error.response?.data?.message, 'error');
        }
    };

    const handleRemovePrincipal = async (userIds) => {
        try {
            await schoolMemberApi.delete(`/${managingSchool.id}/remove`, { data: { userIds } });
            fetchPrincipals(managingSchool.id);
            Swal.fire({ icon: 'success', title: '移除成功', timer: 1000, showConfirmButton: false });
        } catch (error) {
            Swal.fire('移除失败', error.response?.data?.message, 'error');
        }
    };

    const handleSaveClass = async (data) => {
        try {
            if (isAdmin && !editingItem) data.schoolId = currentSchool.id;

            if (editingItem) {
                await classesApi.put(`/${editingItem.id}`, data);
            } else {
                await classesApi.post('/create', data);
            }
            setIsClassModalOpen(false);
            fetchClasses(currentSchool?.id);
            Swal.fire({ icon: 'success', title: '操作成功', timer: 1000, showConfirmButton: false });
        } catch (error) {
            Swal.fire({ icon: 'error', title: '操作失败', text: error.response?.data?.message });
        }
    };

    const handleDeleteClass = async (classId, className) => {
        const res = await Swal.fire({
            title: `删除班级 ${className}?`,
            text: "无法恢复。",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: '确定'
        });
        if (res.isConfirmed) {
            try {
                await classesApi.delete(`/${classId}`);
                fetchClasses(currentSchool?.id);
                Swal.fire('已删除', '', 'success');
            } catch (error) {
                Swal.fire('删除失败', error.response?.data?.message, 'error');
            }
        }
    };

    // --- Render Logic ---

    // 1. Principal Modal
    const renderPrincipalModal = () => (
        <Modal
            show={isPrincipalModalOpen}
            onClose={() => setIsPrincipalModalOpen(false)}
            title={`管理 ${managingSchool?.name} 负责人`}
            size="large"
        >
            <div style={{ marginBottom: '1rem', textAlign: 'right' }}>
                <button className="btn btn-primary" onClick={() => setIsAddPrincipalOpen(true)}>
                    <FontAwesomeIcon icon={faPlus} /> 添加负责人
                </button>
            </div>
            <MemberTable members={schoolPrincipals} canDelete={true} onDelete={handleRemovePrincipal} />
            <AddPrincipalModal
                isOpen={isAddPrincipalOpen}
                onClose={() => setIsAddPrincipalOpen(false)}
                onAdd={handleAddPrincipal}
            />
        </Modal>
    );

    if (currentView === 'classDetail') {
        return (
            <ClassDetailView
                classId={currentClass.id}
                className={currentClass.name}
                onBack={() => { setCurrentView('classes'); setCurrentClass(null); }}
            />
        );
    }

    // 2. 班级列表视图 (含搜索)
    if (currentView === 'classes') {
        return (
            <div>
                <div className={adminStyles.toolbar}>
                    <div className={adminStyles.breadcrumb}>
                        {isAdmin && (
                            <button className="btn btn-primary" onClick={() => { setCurrentView('schools'); setCurrentSchool(null); setClassSearchTerm(''); }}>
                                <FontAwesomeIcon icon={faArrowLeft} /> 返回
                            </button>
                        )}
                        <h2>{currentSchool ? currentSchool.name : '我的学校'} - 班级管理</h2>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => { setEditingItem(null); setIsClassModalOpen(true); }}
                    >
                        <FontAwesomeIcon icon={faPlus} /> 新建班级
                    </button>
                </div>

                {/* --- 班级搜索框 --- */}
                <div className={adminStyles.searchContainer}>
                    <div className={`${adminStyles.inputWrapper} ${classSearchTerm ? adminStyles.hasValue : ''}`}>
                        <FontAwesomeIcon icon={faSearch} className={adminStyles.searchIcon} />
                        <input
                            type="text"
                            placeholder="搜索班级..."
                            className={adminStyles.searchInput}
                            value={classSearchTerm}
                            onChange={(e) => setClassSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleClassSearch()}
                        />
                        <button className={adminStyles.clearButton} onClick={() => { setClassSearchTerm(''); fetchClasses(currentSchool?.id, ''); }}>&times;</button>
                    </div>
                    <button className="btn btn-primary" onClick={handleClassSearch}>搜索</button>
                </div>

                {isLoading ? <Spinner /> : (
                    <div className={adminStyles.classListGrid}>
                        {classes.map(cls => (
                            <ClassCard
                                key={cls.id}
                                classInfo={cls}
                                isAdmin={true}
                                onSelect={() => { setCurrentClass(cls); setCurrentView('classDetail'); }}
                                onEdit={() => { setEditingItem(cls); setIsClassModalOpen(true); }}
                                onDelete={() => handleDeleteClass(cls.id, cls.name)}
                            />
                        ))}
                        {classes.length === 0 && <p className={styles.placeholder}>未找到班级</p>}
                    </div>
                )}

                <ClassModal
                    isOpen={isClassModalOpen}
                    onClose={() => setIsClassModalOpen(false)}
                    onSave={handleSaveClass}
                    classData={editingItem}
                />
            </div>
        );
    }

    // 3. 学校列表视图 (Admin only, 含搜索)
    return (
        <div>
            <div className={adminStyles.toolbar}>
                <h2>学校列表</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => { setEditingItem(null); setIsSchoolModalOpen(true); }}
                >
                    <FontAwesomeIcon icon={faPlus} /> 新建学校
                </button>
            </div>

            {/* --- 学校搜索框 --- */}
            <div className={adminStyles.searchContainer}>
                <div className={`${adminStyles.inputWrapper} ${schoolSearchTerm ? adminStyles.hasValue : ''}`}>
                    <FontAwesomeIcon icon={faSearch} className={adminStyles.searchIcon} />
                    <input
                        type="text"
                        placeholder="搜索学校..."
                        className={adminStyles.searchInput}
                        value={schoolSearchTerm}
                        onChange={(e) => setSchoolSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSchoolSearch()}
                    />
                    <button className={adminStyles.clearButton} onClick={() => { setSchoolSearchTerm(''); fetchSchools(''); }}>&times;</button>
                </div>
                <button className="btn btn-primary" onClick={handleSchoolSearch}>搜索</button>
            </div>

            {isLoading ? <Spinner /> : (
                <div className={adminStyles.classListGrid}>
                    {schools.map(school => (
                        <SchoolCard
                            key={school.id}
                            school={school}
                            onSelect={() => { setCurrentSchool(school); setCurrentView('classes'); setSchoolSearchTerm(''); }}
                            onEdit={(s) => { setEditingItem(s); setIsSchoolModalOpen(true); }}
                            onDelete={handleDeleteSchool}
                            onManageMembers={handleManagePrincipals}
                        />
                    ))}
                    {schools.length === 0 && <p className={styles.placeholder}>未找到学校</p>}
                </div>
            )}

            <SchoolModal
                isOpen={isSchoolModalOpen}
                onClose={() => setIsSchoolModalOpen(false)}
                onSave={handleSaveSchool}
                schoolData={editingItem}
            />
            {renderPrincipalModal()}
        </div>
    );
};

export default AdminView;