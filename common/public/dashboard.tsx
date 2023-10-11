import { PageContainer } from "@ant-design/pro-components";
import { ProCard, StatisticCard } from '@ant-design/pro-components';
import type { ProColumns } from "@ant-design/pro-components";
import { ProTable } from "@ant-design/pro-components";

export type ProjectTableListItem = {
    name: string;
    count: number;
    progress: number;
};

export type WeekDataItem = {
    "Date": string;
    "Value": number;
}

const WeekProjectTableListColumns: ProColumns<WeekDataItem>[] = [
    {
        title: "日期",
        dataIndex: "Date",
        valueType: "text",
    },
    // {
    //     title: "占比",
    //     key: "progress",
    //     dataIndex: "progress",
    //     valueType: (item) => ({
    //         type: "progress"
    //     })
    // },
    {
        title: "访问量",
        dataIndex: "Value"
    }
];

const ProjectTableListColumns: ProColumns<ProjectTableListItem>[] = [
    {
        title: "项目名",
        dataIndex: "name",
        valueType: "text",
    },
    {
        title: "占比",
        key: "progress",
        dataIndex: "progress",
        valueType: (item) => ({
            type: "progress"
        })
    },
    {
        title: "访问量",
        key: "count",
        dataIndex: "count"
    }
];

export type dashboardInitialType = {
    "project_count": number,
    "accesslog_total_count": number,
    "accesslog_month_count": number,
    "accesslog_today_count": number,
    "accesslog_week_count": WeekDataItem[],
    "project_statistic_data": ProjectTableListItem[]
}

export default function DahsboardPage({ DashboardInitialData }: { DashboardInitialData: dashboardInitialType }) {
    return (
        <PageContainer title={'Dashboard'} header={{ breadcrumb: {} }}>
            <ProCard split="horizontal">
                <ProCard split="vertical">
                    <StatisticCard
                        statistic={{
                            title: '今日访问量',
                            value: DashboardInitialData.accesslog_today_count,
                            suffix: '次',
                        }}
                    />
                    <StatisticCard
                        statistic={{
                            title: '本月访问量',
                            value: DashboardInitialData.accesslog_month_count,
                            suffix: '次',
                        }}
                    />
                    <StatisticCard
                        statistic={{
                            title: '用户项目数',
                            value: DashboardInitialData.project_count,
                            suffix: '个',
                        }}
                    />
                    <StatisticCard
                        statistic={{
                            title: '总计访问量',
                            value: DashboardInitialData.accesslog_total_count,
                            suffix: '次',
                        }}
                    />
                </ProCard>
                <ProCard split="vertical">
                    <StatisticCard
                        title="近七日访问量统计表"
                        chart={
                            <ProTable<WeekDataItem>
                                columns={WeekProjectTableListColumns}
                                rowKey="name"
                                search={false}
                                options={false}
                                pagination={false}
                                request={async () => {
                                    return {
                                        data: DashboardInitialData.accesslog_week_count,
                                        success: true,
                                        total: DashboardInitialData.accesslog_week_count.length
                                    };
                                }}
                                dateFormatter="string" />
                        }
                    />
                </ProCard>
                <ProCard split="vertical">
                    <StatisticCard
                        title="项目访问量统计表"
                        chart={
                            <ProTable<ProjectTableListItem>
                                columns={ProjectTableListColumns}
                                rowKey="name"
                                search={false}
                                options={false}
                                pagination={false}
                                request={async () => {
                                    return {
                                        data: DashboardInitialData.project_statistic_data,
                                        success: true,
                                        total: DashboardInitialData.project_statistic_data.length
                                    };
                                }}
                                dateFormatter="string" />
                        }
                    />
                </ProCard>
            </ProCard>
        </PageContainer>
    );
}