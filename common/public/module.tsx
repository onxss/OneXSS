import { ModalForm, PageContainer, ProForm, ProFormSwitch, ProFormText, ProFormTextArea, ProList } from "@ant-design/pro-components";
import { Button, Space, Tag, message, Form, Popconfirm } from "antd";
import { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import Router from "next/router"

type ModuleItem = {
    moduleid: number;
    modulename: string;
    moduledescription: string;
    moduletype: number;
    module_extra_enable: number;
    module_extra_argname: string;
    module_extra_column_name: string;
    modulecontent: string;
    is_self: boolean;
};

type SessionDataItem = {
    userid: number;
    username: string;
    useremail: string;
    usertype: number;
    expiretime: number;
};

export default function ModulePage({ sessionData }: { sessionData: SessionDataItem }) {
    const [ViewModuleForm] = Form.useForm<ModuleItem>();
    const [viewLoading, setViewLoading] = useState(-1);
    const [deleteLoading, setDeleteLoading] = useState(-1);
    const [listFormRefreshKey, setListFormRefreshKey] = useState(0);
    const [addModuleExtraParametersEnabled, setAddModuleExtraParametersEnabled] = useState(false);

    const nameCheckRule = (rule: any, value: any, callback: any) => {
        const pattern = /^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/;
        if (!value) {
            return Promise.reject(new Error("不能为空"));
        }
        if (!pattern.test(value)) {
            return Promise.reject(new Error("只能输入中文/字母/数字/_/-"));
        }
        if (value.length < 4) {
            return Promise.reject(new Error("字符串太短"));
        }
        return Promise.resolve();
    };

    const argsCheckRule = (rule: any, value: any, callback: any) => {
        const pattern = /^[a-zA-Z][a-zA-Z0-9_-]+$/;
        if (!value) {
            return Promise.reject(new Error("不能为空"));
        }
        if (!pattern.test(value)) {
            return Promise.reject(new Error("只能输入字母/数字,且字母为开头"));
        }
        if (value.length < 4) {
            return Promise.reject(new Error("字符串太短"));
        }
        const keywords = [
            'id',
            'projecturl',
            'country',
            'region',
            'city',
            'isp',
            'latitude',
            'longitude',
            'referer',
            'domain',
            'ip',
            'useragent',
            'requestdate',
            'otherdata'
        ];
        let keywords_match_flag: boolean = false;
        keywords.forEach((keyword: string) => {
            if (value.toLowerCase() == keyword) {
                keywords_match_flag = true;
            }
        })
        if (keywords_match_flag) {
            return Promise.reject(new Error("匹配到关键字,请重新输入"));
        }
        return Promise.resolve();
    };

    const funcnameCheckRule = (rule: any, value: any, callback: any) => {
        const pattern = /^[a-zA-Z0-9_\s-]+$/;
        if (!value) {
            return Promise.reject(new Error("不能为空"));
        }
        if (!pattern.test(value)) {
            return Promise.reject(new Error("只能输入字母/数字/空格"));
        }
        if (value.length < 4) {
            return Promise.reject(new Error("字符串太短"));
        }
        return Promise.resolve();
    };

    const argColumnNameCheckRule = (rule: any, value: any, callback: any) => {
        const pattern = /^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/;
        if (!value) {
            return Promise.reject(new Error("不能为空"));
        }
        if (!pattern.test(value)) {
            return Promise.reject(new Error("只能输入字母/数字/中文以及下划线和-"));
        }
        if (value.length < 1) {
            return Promise.reject(new Error("字符串太短"));
        }
        const keywords = [
            'id',
            'projecturl',
            'country',
            'region',
            'city',
            'isp',
            'latitude',
            'longitude',
            'referer',
            'domain',
            'ip',
            'useragent',
            'requestdate',
            'otherdata'
        ];
        let keywords_match_flag: boolean = false;
        keywords.forEach((keyword: string) => {
            if (value.toLowerCase() == keyword) {
                keywords_match_flag = true;
            }
        })
        if (keywords_match_flag) {
            return Promise.reject(new Error("匹配到关键字,请重新输入"));
        }
        return Promise.resolve();
    };

    const textCheckRule = (rule: any, value: any, callback: any) => {
        if (!value) {
            return Promise.reject(new Error("不能为空"));
        }
        if (value.length < 4) {
            return Promise.reject(new Error("字符串太短"));
        }
        return Promise.resolve();
    };
    async function handleAddModuleSubmit(values: any) {
        try {
            const response = await fetch('/api/module/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status==200) {
                message.success("新建模块成功");
                setListFormRefreshKey((prevKey) => prevKey + 1);
                return true;
            }else if(response.status == 401){
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
                return false;
            }
             else {
                message.error("新建模块失败: " + res_message);
                return false;
            }
        } catch (error) {
            message.error("新建模块错误");
            return false;
        }
    }
    const handleViewModule = async (moduleid: number) => {
        try {
            setViewLoading(moduleid);
            const url = `/api/module/find?moduleid=${moduleid}`;
            const response = await fetch(url);
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status==200) {
                for (const key in res_json.data) {
                    if (res_json.data.hasOwnProperty(key)) {
                        ViewModuleForm.setFieldValue(key, res_json.data[key]);
                    }
                }
            } else if (response.status == 401) {
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
            } else {
                message.error("查看模块失败: " + res_message);
            }

        } catch (error) {
            message.error("获取数据失败");
        } finally {
            setViewLoading(-1);
        }
    };


    // const confirmDeleteModule = async () => {
    async function handleDeleteModule(moduleid: number) {
        try {
            setDeleteLoading(moduleid);
            const response = await fetch(`/api/module/delete?moduleid=${moduleid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status==200) {
                message.success("删除模块成功");
                setListFormRefreshKey((prevKey) => prevKey + 1);
            } else if (response.status == 401) {
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
            } else {
                message.error("删除模块失败: " + res_message);
            }
        } catch (error) {
            message.error("删除模块错误: " + error);
        } finally {
            setDeleteLoading(-1);
        }
    };
    return (
        <PageContainer>
            <ProList<ModuleItem>
                toolBarRender={() => {
                    // 添加按钮
                    return [
                        <ModalForm
                            title="新建模块"
                            key="addModuleForm"
                            trigger={
                                <Button type="primary" onClick={() => { setAddModuleExtraParametersEnabled(false); }}>
                                    <PlusOutlined rev={undefined} />
                                    新建模块
                                </Button>
                            }
                            autoFocusFirstInput
                            modalProps={{
                                destroyOnClose: true,
                            }}
                            submitTimeout={2000}
                            onFinish={handleAddModuleSubmit}
                            isKeyPressSubmit
                        >
                            <ProForm.Group>
                                <ProFormText
                                    width="md"
                                    name="modulename"
                                    label="模块名称"
                                    placeholder="请输入名称"
                                    rules={[{ validator: nameCheckRule }]}
                                />
                                <ProFormSwitch
                                    label="公开"
                                    name="moduletype"
                                    initialValue={false}
                                    disabled={sessionData.usertype != 1}
                                />
                                <ProFormSwitch
                                    label="开启额外参数"
                                    name="module_extra_enable"
                                    initialValue={false}
                                    fieldProps={{ onChange: (value) => { setAddModuleExtraParametersEnabled(value) } }}
                                />
                            </ProForm.Group>
                            {addModuleExtraParametersEnabled && (
                                <ProForm.Group>
                                    <ProFormText
                                        width="md"
                                        name="module_extra_argname"
                                        label="额外参数接收名"
                                        placeholder="数据接收时传递的变量名"
                                        tooltip="JS代码执行时将使用该变量名存储并发送函数调用返回值"
                                        rules={[{ validator: argsCheckRule }]}
                                    />
                                    <ProFormText
                                        width="md"
                                        name="module_extra_column_name"
                                        label="额外参数展示列名"
                                        placeholder="数据展示时显示的列名"
                                        tooltip="控制台可视化展示时显示的列名"
                                        rules={[{ validator: argColumnNameCheckRule }]}
                                    />
                                    <ProFormText
                                        width="md"
                                        name="module_extra_func_name"
                                        label="调用函数名"
                                        tooltip="JS代码执行时将调用该函数获取返回值,异步函数请直接添加await,例如await getTest"
                                        placeholder="模块调用函数名"
                                        rules={[{ validator: funcnameCheckRule }]}
                                    />
                                </ProForm.Group>
                            )}
                            <ProFormTextArea
                                // width="auto"
                                name="moduledescription"
                                label="模块描述"
                                placeholder="请输入描述"
                                rules={[{ validator: textCheckRule }]}
                                fieldProps={{ style: { whiteSpace: "pre-wrap" } }}
                            />
                            <ProFormTextArea
                                // width="md
                                name="modulecontent"
                                label="模块代码"
                                placeholder="请输入JS代码"
                                rules={[{ validator: textCheckRule }]}
                                fieldProps={{ style: { whiteSpace: "pre-wrap" } }}
                            />
                        </ModalForm>];
                }}
                key={listFormRefreshKey}
                rowKey="moduleid"
                request={async (params) => {
                    const { pageSize, current } = params;
                    const url = `/api/module/list?pageSize=${pageSize}&current=${current}`;
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
                        dataIndex: "modulename",
                        title: "模块名称",
                    },
                    description: {
                        dataIndex: "moduledescription",
                        title: "模块描述",
                    },
                    subTitle: {
                        dataIndex: "module_extra_enable",
                        render: (_, row) => {
                            return (
                                <Space size={0}>
                                    <Tag color={row.moduletype === 1 ? "green" : "red"} key="privatemodule">
                                        {row.moduletype === 1 ? "公开" : "私有"}
                                    </Tag>
                                    <Tag color={row.is_self ? "green" : "red"} key="privatemodule">
                                        {row.is_self ? "本人创建" : "他人创建"}
                                    </Tag>
                                </Space>
                            );
                        },
                        search: false,
                    },
                    actions: {
                        render: (_, row) => [
                            //查看按钮
                            <ModalForm
                                key="view"
                                title="查看模块"
                                form={ViewModuleForm}
                                loading={viewLoading == row.moduleid}
                                trigger={<Button type="link" onClick={() => handleViewModule(row.moduleid)}>查看</Button>}
                                submitter={{
                                    render: false,
                                }}
                            >
                                <ProForm.Group>
                                    <ProFormText
                                        width="md"
                                        name="modulename"
                                        label="模块名称"
                                        placeholder="请输入名称"
                                        // readonly={true}
                                        disabled={true}
                                    />
                                    <ProFormSwitch
                                        label="公开"
                                        name="moduletype"
                                        // readonly={true}
                                        disabled={true}
                                        initialValue={true}
                                    />
                                    <ProFormSwitch
                                        label="开启额外参数"
                                        name="module_extra_enable"
                                        initialValue={false}
                                        // readonly={true}
                                        disabled={true}
                                    />
                                </ProForm.Group>
                                {row.module_extra_enable == 1 && (
                                    <ProForm.Group>
                                        <ProFormText
                                            width="md"
                                            name="module_extra_argname"
                                            label="额外参数接收名"
                                            placeholder="数据接收时传递的变量名"
                                            tooltip="JS代码执行时将使用该变量名存储并发送函数调用返回值"
                                            disabled={true}
                                        />
                                        <ProFormText
                                            width="md"
                                            name="module_extra_column_name"
                                            label="额外参数展示列名"
                                            placeholder="数据展示时显示的列名"
                                            tooltip="控制台可视化展示时显示的列名"
                                            disabled={true}
                                        />
                                        <ProFormText
                                            width="md"
                                            name="module_extra_func_name"
                                            label="调用函数名"
                                            tooltip="JS代码执行时将调用该函数获取返回值"
                                            placeholder="模块调用函数名"
                                            disabled={true}
                                        />
                                    </ProForm.Group>
                                )}
                                <ProFormTextArea
                                    name="moduledescription"
                                    label="模块描述"
                                    placeholder="请输入描述"
                                    // readonly={true}
                                    fieldProps={{ style: { whiteSpace: "pre-wrap" } }}
                                    disabled={true}
                                />
                                <ProFormTextArea
                                    name="modulecontent"
                                    label="模块代码"
                                    placeholder="请输入JS代码"
                                    // readonly={true}
                                    fieldProps={{ style: { whiteSpace: "pre-wrap" } }}
                                    disabled={true}
                                />
                            </ModalForm>,
                            <Popconfirm
                                title="删除模块"
                                description="删除模块"
                                // open={deleteModuleId == row.moduleid}
                                onConfirm={async () => await handleDeleteModule(row.moduleid)}
                                okButtonProps={{ loading: deleteLoading == row.moduleid }}
                                onCancel={() => { setDeleteLoading(-1); }}
                                okText="确认"
                                cancelText="取消"
                                disabled={!row.is_self} // 已使用的,禁用按钮
                            >
                                <Button type="link" disabled={!row.is_self}>
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
