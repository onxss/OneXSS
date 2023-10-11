import { ModalForm, PageContainer, ProFormSwitch, ProFormText, ProList } from "@ant-design/pro-components";
import { Button, Space, Tag, message, Popconfirm } from "antd";
import { useState } from "react";
import { LockOutlined, MailOutlined, PlusOutlined, ProjectOutlined, UserOutlined } from "@ant-design/icons";
import Router from "next/router"

type UserItem = {
    userid: number;
    username: string;
    useremail: string;
    usertype: number;
    enabled: number;
    projectcount: number;
};
type SessionDataItem = {
    userid: number;
    username: string;
    useremail: string;
    usertype: number;
    expiretime: number;
};

export default function ManagePage({ sessionData }: { sessionData: SessionDataItem }) {
    const [deleteLoading, setDeleteLoading] = useState(-1);
    const [enableLoading, setEnableLoading] = useState(-1);
    const [resetLoading, setRestLoading] = useState(-1);
    const [listFormRefreshKey, setListFormRefreshKey] = useState(0);

    async function handleAddUserSubmit(values: any) {
        try {
            const response = await fetch('/api/manage/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status==200) {
                message.success("新增用户成功");
                setListFormRefreshKey((prevKey) => prevKey + 1);
                return true;
            }else if (response.status == 401) {
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
                return false;
            } else {
                message.error("新增用户失败: " + res_message);
                return false;
            }
        } catch (error) {
            message.error("新增用户错误");
            return false;
        }
    }

    // const confirmDeleteModule = async () => {
    async function handleDeleteUser(userid: number) {
        try {
            setDeleteLoading(userid);
            const response = await fetch(`/api/manage/delete?userid=${userid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status==200) {
                message.success("删除用户成功");
                setListFormRefreshKey((prevKey) => prevKey + 1);
            }else if (response.status == 401) {
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
            } else {
                message.error("删除用户失败: " + res_message);
            }
        } catch (error) {
            message.error("删除用户错误: " + error);
        } finally {
            setDeleteLoading(-1);
        }
    };

    async function handleEnableUser(userid: number) {
        try {
            setEnableLoading(userid);
            const response = await fetch(`/api/manage/enable?userid=${userid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status==200) {
                message.success("修改用户状态成功");
                setListFormRefreshKey((prevKey) => prevKey + 1);
            }else if (response.status == 401) {
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
            } else {
                message.error("修改用户状态失败: " + res_message);
            }
        } catch (error) {
            message.error("修改用户状态错误: " + error);
        } finally {
            setEnableLoading(-1);
        }
    };

    async function handleResetUser(userid: number) {
        try {
            setRestLoading(userid);
            const response = await fetch(`/api/manage/reset?userid=${userid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status==200) {
                message.success(`重置用户密码成功,新密码为: ${res_json.data.new_password}`, 20);
            }else if (response.status == 401) {
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
            } else {
                message.error("重置用户密码失败: " + res_message);
            }
        } catch (error) {
            message.error("重置用户密码错误: " + error);
        } finally {
            setRestLoading(-1);
        }
    };

    return (
        <PageContainer>
            <ProList<UserItem>
                toolBarRender={() => {
                    // 添加按钮
                    return [
                        <ModalForm
                            title="新增用户"
                            key="addUserForm"
                            trigger={
                                <Button type="primary">
                                    <PlusOutlined rev={undefined} />
                                    新增用户
                                </Button>
                            }
                            autoFocusFirstInput
                            modalProps={{
                                destroyOnClose: true,
                            }}
                            submitTimeout={2000}
                            onFinish={handleAddUserSubmit}
                            isKeyPressSubmit
                        >
                            <ProFormText
                                name="username"
                                fieldProps={{
                                    size: 'large',
                                    prefix: <UserOutlined className={'prefixIcon'} rev={undefined} />,
                                }}
                                placeholder={'用户名'}
                                rules={[
                                    {
                                        required: true,
                                        message: '请输入用户名!',
                                    },
                                    {
                                        min: 4,
                                        message: '用户名长度至少为4位！',
                                    }
                                ]}
                            />
                            <ProFormText.Password
                                name="password"
                                fieldProps={{
                                    size: 'large',
                                    prefix: <LockOutlined className={'prefixIcon'} rev={undefined} />,
                                }}
                                placeholder={'登录密码'}
                                rules={[
                                    {
                                        required: true,
                                        message: '请输入密码！',
                                    },
                                    {
                                        min: 8,
                                        message: '密码长度至少为8位！',
                                    }
                                ]}
                            />
                            <ProFormText
                                name="useremail"
                                fieldProps={{
                                    size: 'large',
                                    prefix: <MailOutlined className={'prefixIcon'} rev={undefined} />,
                                }}
                                placeholder={'邮箱'}
                                rules={[
                                    {
                                        required: true,
                                        message: '请输入邮箱！',
                                    },
                                    {
                                        type: 'email',
                                        message: '请输入有效的邮箱地址！',
                                    },
                                ]}
                            />
                            <ProFormSwitch
                                checkedChildren="管理员"
                                unCheckedChildren="普通用户"
                                name="usertype"
                                initialValue={false}
                                fieldProps={{ onChange: (value) => { if (value) { message.warning("多一个管理,多一份风险"); } } }}
                            />
                        </ModalForm>];
                }}
                key={listFormRefreshKey}
                rowKey="userid"
                request={async (params) => {
                    const { pageSize, current } = params;
                    const url = `/api/manage/list?pageSize=${pageSize}&current=${current}`;
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
                    pageSize: 5,
                }}
                showActions="hover"
                metas={{
                    title: {
                        dataIndex: "username",
                        title: "用户名",
                    },
                    description: {
                        dataIndex: "useremail",
                        title: "邮箱"
                    },
                    // projectcount: {
                    //     dataIndex: "projectcount",
                    //     title: "项目数量",
                    // },
                    subTitle: {
                        dataIndex: "enabled",
                        render: (_, row) => {
                            return (
                                <Space size={0}>
                                    <Tag color={row.usertype === 1 ? "yellow" : "green"} key="usertype_tag">
                                        {row.usertype === 1 ? "管理员" : "用户"}
                                    </Tag>
                                    <Tag color={row.enabled === 1 ? "green" : "red"} key="enabled_tag">
                                        {row.enabled === 1 ? "正常" : "已禁用"}
                                    </Tag>
                                    <Tag icon={<ProjectOutlined rev={undefined} />} key="projectcount_tag">
                                        {row.projectcount}
                                    </Tag>
                                </Space>
                            );
                        },
                        search: false,
                    },
                    actions: {
                        render: (_, row) => [
                            <Popconfirm
                                title="重置密码"
                                description="重置密码"
                                onConfirm={async () => await handleResetUser(row.userid)}
                                okButtonProps={{ loading: resetLoading == row.userid }}
                                onCancel={() => { setRestLoading(-1); }}
                                okText="确认"
                                cancelText="取消"
                                disabled={row.userid == sessionData.userid} // 已使用的,禁用按钮
                            >
                                <Button type="link" disabled={row.userid == sessionData.userid}>
                                    重置密码
                                </Button>
                            </Popconfirm>,
                            <Popconfirm
                                title={row.enabled === 1 ? "禁用用户" : "启用用户"}
                                description={row.enabled === 1 ? "禁用用户,同时会禁用该用户的所有项目" : "启用用户后,用户项目需要手动启用"}
                                onConfirm={async () => await handleEnableUser(row.userid)}
                                okButtonProps={{ loading: enableLoading == row.userid }}
                                onCancel={() => { setEnableLoading(-1); }}
                                okText="确认"
                                cancelText="取消"
                                disabled={row.userid == sessionData.userid || row.usertype == 1} // 已使用的,禁用按钮
                            >
                                <Button type="link" disabled={row.userid == sessionData.userid || row.usertype == 1}>
                                    {row.enabled === 1 ? "禁用" : "启用"}
                                </Button>
                            </Popconfirm>,
                            <Popconfirm
                                title="删除"
                                description="警告: 删除用户的同时会删除该用户关联的所有项目和日志"
                                onConfirm={async () => await handleDeleteUser(row.userid)}
                                okButtonProps={{ loading: deleteLoading == row.userid }}
                                onCancel={() => { setDeleteLoading(-1); }}
                                okText="确认"
                                cancelText="取消"
                                disabled={row.userid == sessionData.userid || row.usertype == 1} // 已使用的,禁用按钮
                            >
                                <Button type="link" disabled={row.userid == sessionData.userid || row.usertype == 1}>
                                    删除
                                </Button>
                            </Popconfirm>
                        ],
                    },
                }}
            />
        </PageContainer>
    );
}
