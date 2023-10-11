import { ModalForm, PageContainer, ProForm, ProFormSelect, ProFormSwitch, ProFormText, ProFormTextArea, ProList } from "@ant-design/pro-components";
import { Button, Space, Tag, message, Form, Popconfirm } from "antd";
import { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import Router from "next/router"

type ProjectItem = {
    enabled: number;
    projectid: number;
    projectname: string;
    projectdescription: string;
    projecturl: string;
    obfuscate_enable: number;
    obfuscate_code: string;
    telegram_notice_enable: number;
    telegram_notice_token: string;
    telegram_notice_chatid: string;
};

interface Module {
    moduleid: number;
    modulename: string;
}

async function getModuleEnum() {
    let extractedData: { label: string; value: string }[] = [];
    try {
        const response = await fetch("/api/module/list?pageSize=999999&current=1");
        const res_json = await response.json();
        const res_message = res_json.message;

        if (response.ok && response.status == 200) {
            extractedData = res_json.data.map((item: Module) => ({
                label: item.modulename,
                value: item.moduleid
            }));
        } else if (response.status == 401) {
            message.error("登陆状态异常");
            await fetch('/api/user?action=logout');
            Router.push('/');
        } else {
            message.error("获取模块失败: " + res_message);
        }
    } catch (error) {
        message.error("获取模块错误: " + error);
    }
    return extractedData;
}
export default function ProjectPage() {
    const [form] = Form.useForm<ProjectItem>();
    const [viewLoading, setViewLoading] = useState(-1);
    const [deleteLoading, setDeleteLoading] = useState(-1);
    const [cleanLoading, setCleanLoading] = useState(-1);
    const [enableLoading, setEnableLoading] = useState(-1);
    const [obfuscateLoading, setObfuscateLoading] = useState(-1);
    const [listFormRefreshKey, setListFormRefreshKey] = useState(0);

    const [telegramNoticeEnabled, setTelegramNoticeEnabled] = useState(false);
    const [viewtelegramNoticeEnabled, setViewTelegramNoticeEnabled] = useState(false);

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

    const textCheckRule = (rule: any, value: any, callback: any) => {
        if (!value) {
            return Promise.reject(new Error("不能为空"));
        }
        if (value.length < 4) {
            return Promise.reject(new Error("字符串太短"));
        }
        return Promise.resolve();
    };
    async function handleAddProjectSubmit(values: any) {
        try {
            const response = await fetch('/api/project/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status == 200) {
                message.success("新建项目成功,请刷新页面");
                setListFormRefreshKey((prevKey) => prevKey + 1);
                return true;
            } else if (response.status == 401) {
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
            } else {
                message.error("新建项目失败: " + res_message);
                return false;
            }
        } catch (error) {
            message.error("新建项目错误" + error);
            return false;
        }
    }
    const handleViewProject = async (projectid: number) => {
        try {
            setViewLoading(projectid);
            const url = `/api/project/find?projectid=${projectid}`;
            const response = await fetch(url);
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status == 200) {
                if (res_json.data.telegram_notice_enable == 1) {
                    setViewTelegramNoticeEnabled(true);
                } else {
                    setViewTelegramNoticeEnabled(false);
                }
                for (const key in res_json.data) {
                    if (res_json.data.hasOwnProperty(key)) {
                        form.setFieldValue(key, res_json.data[key]);
                    }
                }
            } else if (response.status == 401) {
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
            } else {
                message.error("获取数据失败: " + res_message);
            }

        } catch (error) {
            message.error("获取数据失败");
        } finally {
            setViewLoading(-1);
        }
    };

    async function handleEditProjectSubmit(values: any) {
        // View返回的module_id_list和edit所需的module_id_list格式不同,需要进行转换
        function isViewFormat(module_id_list: number[] | { value: number; label: string; }[]) {
            if (Array.isArray(module_id_list) && module_id_list.length > 0) {
                const firstItem = module_id_list[0];
                return typeof firstItem === 'object' && 'value' in firstItem && 'label' in firstItem;
            }
            return false;
        }
        function convertToEditFormat(module_id_list: { value: number; label: string; }[]) {
            if (isViewFormat(module_id_list)) {
                const convertedList = module_id_list.map(item => item.value);
                return convertedList;
            }
            return module_id_list;
        }
        if (isViewFormat(values.module_id_list)) {
            values.module_id_list = convertToEditFormat(values.module_id_list);
        }
        try {
            const response = await fetch('/api/project/edit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status == 200) {
                message.success("编辑项目成功");
                setListFormRefreshKey((prevKey) => prevKey + 1);
                return true;
            } else if (response.status == 401) {
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
                return false;
            } else {
                message.error("编辑项目失败: " + res_message);
                return false;
            }
        } catch (error) {
            message.error("编辑项目错误");
            return false;
        }
    };
    async function handleDeleteProject(projectid: number) {
        try {
            setDeleteLoading(projectid);
            const response = await fetch(`/api/project/delete?projectid=${projectid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status == 200) {
                message.success("删除项目成功");
                setListFormRefreshKey((prevKey) => prevKey + 1);
            } else if (response.status == 401) {
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
            } else {
                message.error("删除项目失败: " + res_message);
            }
        } catch (error) {
            message.error("删除项目错误: " + error);
        } finally {
            setDeleteLoading(-1);
        }
    };
    async function handleEnableProject(projectid: number) {
        try {
            setEnableLoading(projectid);
            const response = await fetch(`/api/project/enable?projectid=${projectid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status == 200) {
                message.success("修改项目状态成功");
                setListFormRefreshKey((prevKey) => prevKey + 1);
            } else if (response.status == 401) {
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
            } else {
                message.error("修改项目状态失败: " + res_message);
            }
        } catch (error) {
            message.error("修改项目状态错误: " + error);
        } finally {
            setEnableLoading(-1);
        }
    };
    async function handleObfuscateProject(projectid: number) {
        try {
            setObfuscateLoading(projectid);
            const response = await fetch(`/api/project/obfuscate?projectid=${projectid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status == 200) {
                message.success("修改项目混淆成功");
                setListFormRefreshKey((prevKey) => prevKey + 1);
            } else if (response.status == 401) {
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
            } else {
                message.error("修改项目混淆失败: " + res_message);
            }
        } catch (error) {
            message.error("修改项目混淆错误: " + error);
        } finally {
            setObfuscateLoading(-1);
        }
    };
    async function handleCleanProject(projectid: number) {
        try {
            setCleanLoading(projectid);
            const response = await fetch(`/api/project/clean?projectid=${projectid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const res_json = await response.json();
            const res_message = res_json.message;
            if (response.ok && response.status == 200) {
                message.success("清空项目日志成功");
                setListFormRefreshKey((prevKey) => prevKey + 1);
            } else if (response.status == 401) {
                message.error("登陆状态异常");
                await fetch('/api/user?action=logout');
                Router.push('/');
            } else {
                message.error("清空项目失败: " + res_message);
            }
        } catch (error) {
            message.error("清空项目日志错误: " + error);
        } finally {
            setCleanLoading(-1);
        }
    };

    return (
        <PageContainer>
            <ProList<ProjectItem>
                toolBarRender={() => {
                    // 添加按钮
                    return [
                        <ModalForm
                            title="新建项目"
                            key="addProjectForm"
                            trigger={
                                <Button type="primary" onClick={() => { setTelegramNoticeEnabled(false); }}>
                                    <PlusOutlined rev={undefined} />
                                    新建项目
                                </Button>
                            }
                            autoFocusFirstInput
                            modalProps={{
                                destroyOnClose: true,
                            }}
                            submitTimeout={5000}
                            onFinish={handleAddProjectSubmit}
                            isKeyPressSubmit
                        >
                            <ProForm.Group>
                                <ProFormText
                                    width="md"
                                    name="projectname"
                                    label="项目名称"
                                    placeholder="请输入名称"
                                    rules={[{ validator: nameCheckRule }]}
                                />
                                <ProFormSwitch
                                    label="开启Telegram通知"
                                    name="telegram_notice_enable"
                                    initialValue={false}
                                    fieldProps={{ onChange: (value) => { setTelegramNoticeEnabled(value) } }}
                                />
                            </ProForm.Group>
                            {telegramNoticeEnabled && (
                                <ProForm.Group>
                                    <ProFormText
                                        width="md"
                                        name="telegram_notice_token"
                                        label="Telegram Bot Token"
                                        placeholder="请填写Token"
                                        initialValue={''}
                                        tooltip="将使用此Token发送消息"
                                        rules={[
                                            {
                                                required: true,
                                                message: '请填入Token',
                                                type: 'string',
                                            },
                                        ]}
                                    />
                                    <ProFormText
                                        width="md"
                                        name="telegram_notice_chatid"
                                        label="Telegram接收Chat ID"
                                        placeholder="请填写Chat ID"
                                        initialValue={''}
                                        tooltip="将发送到此ChatID"
                                        rules={[
                                            {
                                                required: true,
                                                message: '请填入Chat ID',
                                                type: 'string',
                                            },
                                        ]}
                                    />
                                </ProForm.Group>
                            )}
                            <ProFormSelect
                                name="module_id_list"
                                label="请选择模块"
                                // valueEnum={{}}
                                request={getModuleEnum}
                                fieldProps={{
                                    mode: 'multiple',
                                }}
                                placeholder="请选择模块"
                                rules={[
                                    {
                                        required: true,
                                        message: '至少选择一个模块',
                                        type: 'array',
                                    },
                                ]}
                            />
                            <ProFormTextArea
                                // width="auto"
                                name="projectdescription"
                                label="项目描述"
                                placeholder="请输入描述"
                                fieldProps={{ style: { whiteSpace: "pre-wrap" } }}
                                rules={[{ validator: textCheckRule }]}
                            />

                        </ModalForm>];
                }}
                key={listFormRefreshKey}
                rowKey="name"
                request={async (params) => {
                    const { pageSize, current } = params;
                    const url = `/api/project/list?pageSize=${pageSize}&current=${current}`;
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
                        dataIndex: "projectname",
                        title: "项目名称",
                    },
                    description: {
                        dataIndex: "projectdescription",
                        title: "项目描述",
                    },
                    subTitle: {
                        dataIndex: "enabled",
                        render: (_, row) => {
                            return (
                                <Space size={0}>
                                    <Tag color={row.enabled === 1 ? "green" : "red"} key="projectenabled_tag">
                                        {row.enabled === 1 ? "运行中" : "已禁用"}
                                    </Tag>

                                    <Tag color={row.enabled === 1 ? "green" : "red"} key="projecturl_tag">
                                        {row.projecturl}
                                    </Tag>

                                    <Tag color={row.obfuscate_enable === 1 ? "green" : "red"} key="obfuscate_enable_tag">
                                        {row.obfuscate_enable === 1 ? "开启混淆" : "关闭混淆"}
                                    </Tag>

                                    {row.telegram_notice_enable === 1 && <Tag color="green" key="project_tg_notice_enabled_tag">
                                        TG通知
                                    </Tag>
                                    }
                                </Space>
                            );
                        },
                        search: false,
                    },
                    projecturl: {
                        dataIndex: "projecturl",
                        title: "项目链接",
                    },
                    enabled: {
                        dataIndex: "enabled",
                        title: "项目状态",
                    },
                    actions: {
                        render: (_, row) => [
                            <ModalForm
                                key="viewprojecturl"
                                title="查看代码"
                                form={form}
                                trigger={<Button type="link" >查看代码</Button>}
                                submitter={{
                                    render: false,
                                }}
                                modalProps={{
                                    destroyOnClose: true,
                                }}
                            >
                                <ProFormText
                                    name="projecturl"
                                    label="项目URL"
                                    tooltip="图片探测请在URL后添加.png/.jpg/.gif后缀名"
                                    // readonly={true}
                                    initialValue={"//" + row.projecturl}
                                    disabled={true}
                                />
                                <ProFormText
                                    name="projecturl_script"
                                    label="常规代码"
                                    // readonly={true}
                                    initialValue={"<script src=//" + row.projecturl + "></script>"}
                                    disabled={true}
                                />
                                <ProFormText
                                    name="projecturl_img"
                                    label="图片探测代码"
                                    tooltip="图片探测请在URL后添加.png/.jpg/.gif后缀名"
                                    // readonly={true}
                                    initialValue={"<img src=//" + row.projecturl + ".png >"}
                                    disabled={true}
                                />
                            </ModalForm>
                            ,
                            //查看按钮
                            <ModalForm
                                key="viewproject"
                                title="查看项目"
                                form={form}
                                loading={viewLoading == row.projectid}
                                trigger={<Button type="link" onClick={() => handleViewProject(row.projectid)}>查看项目</Button>}
                                submitter={{
                                    render: false,
                                }}
                                modalProps={{
                                    destroyOnClose: true,
                                }}
                            >
                                <ProForm.Group>
                                    <ProFormText
                                        width="md"
                                        name="projectname"
                                        label="项目名称"
                                        disabled={true}
                                    />
                                    <ProFormText
                                        width="md"
                                        name="projectid"
                                        label="项目ID"
                                        disabled
                                    />
                                    <ProFormSwitch
                                        label="开启Telegram通知"
                                        name="telegram_notice_enable"
                                        disabled
                                    />
                                </ProForm.Group>
                                {viewtelegramNoticeEnabled && (
                                    <ProForm.Group>
                                        <ProFormText
                                            width="md"
                                            name="telegram_notice_token"
                                            label="Telegram Bot Token"
                                            disabled
                                        />
                                        <ProFormText
                                            width="md"
                                            name="telegram_notice_chatid"
                                            label="Telegram接收Chat ID"
                                            disabled
                                        />
                                    </ProForm.Group>
                                )}
                                <ProFormTextArea
                                    name="projectdescription"
                                    label="项目描述"
                                    // readonly={true}
                                    fieldProps={{ style: { whiteSpace: "pre-wrap" } }}
                                    disabled={true}
                                />
                                <ProFormText
                                    name="projecturl"
                                    label="项目URL"
                                    tooltip="图片探测请在URL后添加.png/.jpg/.gif后缀名"
                                    // readonly={true}
                                    disabled={true}
                                />
                                <ProFormSelect
                                    name="module_id_list"
                                    label="项目使用模块"
                                    fieldProps={{
                                        mode: 'multiple',
                                    }}
                                    disabled={true}
                                />
                                <ProFormTextArea
                                    name="projectcode"
                                    label="项目当前代码"
                                    fieldProps={{ style: { whiteSpace: "pre-wrap" } }}
                                    // readonly={true}
                                    disabled={true}
                                />
                            </ModalForm>,
                            //清空日志按钮
                            <Popconfirm
                                title="清空日志"
                                description="是否清空日志"
                                onConfirm={async () => await handleCleanProject(row.projectid)}
                                okButtonProps={{ loading: cleanLoading == row.projectid }}
                                onCancel={() => { setCleanLoading(-1); }}
                                okText="确认"
                                cancelText="取消"
                            >
                                <Button type="link">
                                    清空日志
                                </Button>
                            </Popconfirm>,
                            //混淆按钮
                            <Popconfirm
                                title={row.obfuscate_enable == 1 ? "关闭混淆" : "开启混淆"}
                                description={row.obfuscate_enable == 1 ? "是否关闭混淆?" : "是否开启混淆? \n(使用 https://www.bytehide.com/products/shield-obfuscator/javascript/react 接口进行混淆)"}
                                onConfirm={async () => await handleObfuscateProject(row.projectid)}
                                okButtonProps={{ loading: obfuscateLoading == row.projectid }}
                                onCancel={() => { setObfuscateLoading(-1); }}
                                okText="确认"
                                cancelText="取消"
                            >
                                <Button type="link">
                                    {row.obfuscate_enable == 1 ? "禁用混淆" : "启用混淆"}
                                </Button>
                            </Popconfirm>,
                            //编辑按钮
                            <ModalForm
                                key="edit_project"
                                title="编辑项目"
                                form={form}
                                // loading={viewLoading == row.projectid}
                                trigger={<Button type="link" onClick={async () => await handleViewProject(row.projectid)}>编辑</Button>}
                                autoFocusFirstInput
                                modalProps={{
                                    destroyOnClose: true,
                                }}
                                submitTimeout={5000}
                                onFinish={handleEditProjectSubmit}
                                isKeyPressSubmit
                            >
                                <ProForm.Group>
                                    <ProFormText
                                        width="md"
                                        name="projectname"
                                        label="项目名称"
                                        placeholder="请输入名称"
                                        rules={[{ validator: nameCheckRule }]}
                                        disabled
                                    />
                                    <ProFormText
                                        width="md"
                                        name="projectid"
                                        label="项目ID"
                                        disabled
                                    />
                                    <ProFormSwitch
                                        label="开启Telegram通知"
                                        name="telegram_notice_enable"
                                        initialValue={false}
                                        fieldProps={{ onChange: (value) => { setViewTelegramNoticeEnabled(value) } }}
                                    />
                                </ProForm.Group>
                                {viewtelegramNoticeEnabled && (
                                    <ProForm.Group>
                                        <ProFormText
                                            width="md"
                                            name="telegram_notice_token"
                                            label="Telegram Bot Token"
                                            placeholder="请填写Token"
                                            initialValue={''}
                                            tooltip="将使用此Token发送消息"
                                            rules={[
                                                {
                                                    required: true,
                                                    message: '请填入Token',
                                                    type: 'string',
                                                },
                                            ]}
                                        />
                                        <ProFormText
                                            width="md"
                                            name="telegram_notice_chatid"
                                            label="Telegram接收Chat ID"
                                            placeholder="请填写Chat ID"
                                            initialValue={''}
                                            tooltip="将发送到此ChatID"
                                            rules={[
                                                {
                                                    required: true,
                                                    message: '请填入Chat ID',
                                                    type: 'string',
                                                },
                                            ]}
                                        />
                                    </ProForm.Group>
                                )}
                                <ProFormSelect
                                    name="module_id_list"
                                    label="项目使用模块"
                                    request={getModuleEnum}
                                    fieldProps={{
                                        mode: 'multiple',
                                    }}
                                    placeholder="请选择模块"
                                    rules={[
                                        {
                                            required: true,
                                            message: '至少选择一个模块',
                                            type: 'array',
                                        },
                                    ]}
                                />
                                <ProFormTextArea
                                    name="projectdescription"
                                    label="项目描述"
                                    fieldProps={{ style: { whiteSpace: "pre-wrap" } }}
                                    rules={[{ validator: textCheckRule }]}
                                />
                            </ModalForm>,
                            //禁用/启用按钮
                            <Popconfirm
                                title={row.enabled == 1 ? "禁用项目" : "启用项目"}
                                description={row.enabled == 1 ? "是否禁用项目?" : "是否启用项目?"}
                                onConfirm={async () => await handleEnableProject(row.projectid)}
                                okButtonProps={{ loading: enableLoading == row.projectid }}
                                onCancel={() => { setEnableLoading(-1); }}
                                okText="确认"
                                cancelText="取消"
                            >
                                <Button type="link">
                                    {row.enabled == 1 ? "禁用" : "启用"}
                                </Button>
                            </Popconfirm>,
                            // 删除按钮
                            <Popconfirm
                                title="删除项目"
                                description="是否删除项目"
                                onConfirm={async () => await handleDeleteProject(row.projectid)}
                                okButtonProps={{ loading: deleteLoading == row.projectid }}
                                onCancel={() => { setDeleteLoading(-1); }}
                                okText="确认"
                                cancelText="取消"
                            >
                                <Button type="link">
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
