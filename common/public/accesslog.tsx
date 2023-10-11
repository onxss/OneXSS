import { PageContainer, ProTable } from '@ant-design/pro-components';
import React, { useEffect, useState } from 'react';
import { Button, Tooltip, message, Modal, Space, Popconfirm } from 'antd';
import Router from "next/router"

// 正则表达式匹配Base64编码的图片字符串格式
function isBase64ImageString(str: string): boolean {
    const base64ImageRegex = /^data:image\/(png|jpeg|jpg|gif|svg\+xml);base64,[a-zA-Z0-9+/=\s]+$/;
    return base64ImageRegex.test(str);
}

export default function AccesslogPage({ pathname }: { pathname: string }) {
    let projectid = -1;
    const projectid_match = pathname.match(/\/accesslog\/project-(\d+)/);
    if (projectid_match != null && projectid_match.length > 0) {
        projectid = parseInt(projectid_match[1], 10);
    } else {
        message.warning("项目ID错误,请刷新页面");
    }
    const [formRefreshKey, setFormRefreshKey] = useState(0);
    const [dynamicProjectName, setDynamicProjectName] = useState("");
    const [loading, setLoading] = useState(true);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewImage, setPreviewImage] = useState("");
    const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const defaultColumns = [
        {
            title: 'id',
            dataIndex: 'id',
            key: 'id',
            hideInSearch: true
        },
        {
            title: '请求时间',
            dataIndex: 'requestdate',
            key: 'requestdate',
            valueType: 'dateTime',
            hideInSearch: true
        },
        {
            title: '访问IP',
            dataIndex: 'ip',
            key: 'ip',
        },
        {
            title: '国家',
            dataIndex: 'country',
            key: 'country',
            hideInSearch: true,
            render: (text: any) => {
                return <Tooltip title={text}>
                    {text.length > 20 ? text.slice(0, 20) + '...' : text}
                </Tooltip>
            }
        },
        {
            title: '省份',
            dataIndex: 'region',
            key: 'region',
            hideInSearch: true,
            render: (text: any) => {
                return <Tooltip title={text}>
                    {text.length > 20 ? text.slice(0, 20) + '...' : text}
                </Tooltip>
            }
        },
        {
            title: '城市',
            dataIndex: 'city',
            key: 'city',
            hideInSearch: true,
            valueEnum: {},
            render: (text: any) => {
                return <Tooltip title={text}>
                    {text.length > 20 ? text.slice(0, 20) + '...' : text}
                </Tooltip>
            }
        },
        {
            title: '运营商',
            dataIndex: 'isp',
            key: 'isp',
            hideInSearch: true,
            render: (text: any) => {
                return <Tooltip title={text}>
                    {text.length > 20 ? text.slice(0, 20) + '...' : text}
                </Tooltip>
            }
        },
        {
            title: 'Referer',
            dataIndex: 'referer',
            key: 'referer',
            hideInSearch: true,
            render: (text: any) => {
                return <Tooltip title={text}>
                    {text.length > 20 ? text.slice(0, 20) + '...' : text}
                </Tooltip>
            }
        },
        {
            title: 'User-Agent',
            dataIndex: 'useragent',
            key: 'useragent',
            hideInSearch: true,
            render: (text: any) => {
                return <Tooltip title={text}>
                    {text.length > 20 ? text.slice(0, 20) + '...' : text}
                </Tooltip>
            }
        },
        //   { // 暂时隐藏
        //     title: 'IP定位',
        //     dataIndex: 'location',
        //     key: 'location',
        //   },
    ];
    const [dynamicColumns, setDynamicColumns] = useState(defaultColumns);
    useEffect(() => {
        async function getInitData() {
            setLoading(true);
            const response = await fetch(`/api/accesslog?action=init&projectid=${projectid}`);
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status==200) {
            } else if (response.status == 401) {
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
                return;
            } else {
                message.error("获取表样式失败: " + res_message);
                return;
            }
            setDynamicProjectName(res_json.data.projectname);
            const dynamicColumnsWithRender = [...defaultColumns];
            // 动态渲染自定义字段中的base64图片
            for (const column of res_json.data.columns) {
                if (column.key == "domain") { // 手动处理域名
                    const columnWithRender = {
                        ...column,
                        valueEnum: res_json.data.domain_list,
                        valueType: 'select'
                    };
                    dynamicColumnsWithRender.push(columnWithRender);
                }
                else {
                    const columnWithRender = {
                        ...column,
                        hideInSearch: true,
                        render: (text: any) => {
                            if (isBase64ImageString(text)) {
                                return (
                                    <img
                                        src={text}
                                        alt="图片"
                                        style={{ width: 100, height: 'auto', cursor: 'pointer' }}
                                        onClick={() => {
                                            setPreviewVisible(true);
                                            setPreviewImage(text);
                                        }}
                                    />
                                );
                            } else {
                                return (
                                    <Tooltip title={text}>
                                        {text.length > 10 ? text.slice(0, 10) + '...' : text}
                                    </Tooltip>
                                );
                            }
                        },
                    };
                    dynamicColumnsWithRender.push(columnWithRender);
                }
            }
            setDynamicColumns(dynamicColumnsWithRender);
            setLoading(false);
        }
        getInitData();
    }, []);

    async function handleDeleteSelectedRowKeys() {
        setDeleteLoading(true);
        try {
            const response = await fetch('/api/accesslog?action=delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ "keys": selectedRowKeys }),
            });
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status==200) {
                message.success('批量删除成功');
                setFormRefreshKey((prevKey) => prevKey + 1);
                return true;
            }else if(response.status == 401){
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
                return false;
            }
             else {
                message.error('批量删除失败: ' + res_message);
                return false;
            }
        } catch (error) {
            message.error('连接失败,请检查网络');
            return false;
        } finally {
            setDeleteLoading(false);
        }
    }
    return (
        <PageContainer title={'项目日志: ' + dynamicProjectName} header={{ breadcrumb: {} }}>
            <ProTable
                key={formRefreshKey}
                columns={dynamicColumns}
                loading={loading}
                search={{
                    filterType: 'light',
                }}
                // options={false}
                request={async (params) => {
                    const { pageSize, current, ip, domain } = params;
                    let url = `/api/accesslog?action=list&pageSize=${pageSize}&current=${current}&projectid=${projectid}`;
                    if(ip!=undefined){
                        url += `&ip=${ip}`;
                    }
                    if(domain!=undefined){
                        url += `&domain=${domain}`;
                    }
                    try {
                      const response = await fetch(url);
                      if (response.status === 401) {
                        message.error('登录状态异常');
                        Router.push('/');
                        return {
                          data: [],
                          success: false,
                        };
                      }
                      const data = await response.json();
                      return {
                        data: data.data,
                        success: true,
                        total: data.total,
                      };
                    } catch (error) {
                      message.error('请求数据失败');
                      return {
                        data: [],
                        success: false,
                      };
                    }
                  }}
                pagination={{
                    pageSize: 20,
                }}
                rowSelection={{
                    // 自定义选择项参考: https://ant.design/components/table-cn/#components-table-demo-row-selection-custom
                    // 注释该行则默认不显示下拉选项
                    // selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT],
                    // defaultSelectedRowKeys: [1],
                }}
                tableAlertRender={({
                    selectedRowKeys,
                    selectedRows,
                    onCleanSelected,
                }) => {
                    setSelectedRowKeys(selectedRowKeys);
                    return (
                        <Space size={24}>
                            <span>
                                已选 {selectedRowKeys.length} 项
                                <Button type='link' style={{ marginInlineStart: 8 }} onClick={onCleanSelected}>
                                    取消选择
                                </Button>
                                <Popconfirm
                                    title="批量删除"
                                    description={`是否删除已选中的${selectedRowKeys.length}项`}
                                    onConfirm={async () => {
                                        if (await handleDeleteSelectedRowKeys()) {
                                            onCleanSelected();
                                        }
                                    }}
                                    okButtonProps={{ loading: deleteLoading }}
                                    onCancel={() => { setDeleteLoading(false); }}
                                    okText="确认"
                                    cancelText="取消"
                                >
                                    <Button type="link">
                                        批量删除
                                    </Button>
                                </Popconfirm>
                            </span>
                        </Space>
                    );
                }}
                tableAlertOptionRender={false}
                rowKey="id"
                dateFormatter="string"
            />

            <Modal
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={null}
            >
                <img alt="预览" style={{ width: '100%' }} src={previewImage} />
            </Modal>
        </PageContainer>
    );
}
