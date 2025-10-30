import React from 'react';
import Drawer from '../../../components/common/Drawer/Drawer';
import DiscussionBoard from './Discussion/DiscussionBoard';

const DiscussionDrawer = ({ target, onClose }) => {
    if (!target) return null;

    const { ownerId, ownerType, title } = target;

    return (
        <Drawer
            isOpen={!!target}
            onClose={onClose}
            title={`"${title}" 的讨论区`}
        >
            <DiscussionBoard ownerId={ownerId} ownerType={ownerType} />
        </Drawer>
    );
};

export default DiscussionDrawer;