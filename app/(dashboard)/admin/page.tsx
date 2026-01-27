'use client';

import { useState, useEffect } from 'react';
import { FileText, Users, Upload, TrendingUp } from 'lucide-react';
import styles from './page.module.css';

interface DashboardStats {
    totalPapers: number;
    totalTeachers: number;
    totalDownloads: number;
    recentUploads: number;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({
        totalPapers: 0,
        totalTeachers: 0,
        totalDownloads: 0,
        recentUploads: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch papers count
                const papersRes = await fetch('/api/papers?limit=1000');
                if (papersRes.ok) {
                    const data = await papersRes.json();
                    setStats(prev => ({
                        ...prev,
                        totalPapers: data.items?.length || 0,
                        totalDownloads: data.items?.reduce((sum: number, p: { downloadCount?: number }) => sum + (p.downloadCount || 0), 0) || 0,
                    }));
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const statCards = [
        { icon: FileText, label: 'Total Papers', value: stats.totalPapers, color: '#3b82f6' },
        { icon: Users, label: 'Teachers', value: stats.totalTeachers, color: '#10b981' },
        { icon: TrendingUp, label: 'Total Downloads', value: stats.totalDownloads, color: '#f59e0b' },
        { icon: Upload, label: 'This Month', value: stats.recentUploads, color: '#8b5cf6' },
    ];

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Dashboard</h1>
                <p className={styles.subtitle}>Welcome back! Here&apos;s an overview of your question paper bank.</p>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                {statCards.map((stat) => (
                    <div key={stat.label} className={styles.statCard}>
                        <div className={styles.statIcon} style={{ backgroundColor: `${stat.color}20` }}>
                            <stat.icon size={24} style={{ color: stat.color }} />
                        </div>
                        <div className={styles.statContent}>
                            <span className={styles.statValue}>
                                {loading ? '...' : stat.value}
                            </span>
                            <span className={styles.statLabel}>{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Quick Actions</h2>
                <div className={styles.actionsGrid}>
                    <a href="/admin/bulk-upload" className={styles.actionCard}>
                        <Upload size={32} />
                        <span>Bulk Upload Papers</span>
                    </a>
                    <a href="/admin/teachers" className={styles.actionCard}>
                        <Users size={32} />
                        <span>Manage Teachers</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
