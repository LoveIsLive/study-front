import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../Header/Header';
import styles from './MainLayout.module.css';

const MainLayout = () => {
    return (
        <>
            <Header />
            <main className={styles.mainContent}>
                <Outlet />
            </main>
        </>
    );
};

export default MainLayout;