import {
  AppstoreAddOutlined,
  DashboardOutlined,
  DeleteOutlined,
  IeOutlined,
  LockOutlined,
  LogoutOutlined,
  MailOutlined,
  PlusOutlined,
  ProjectOutlined,
  ShareAltOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { ModalForm, ProForm, ProFormText, ProLayout, ProTable } from '@ant-design/pro-components';
import { Button, Divider, Input, Popconfirm, Space, Tag, message } from 'antd';
import { Tooltip } from 'antd';
import React, { useState } from 'react';
import ModulePage from "../common/public/module";
import ProjectPage from "../common/public/project";
import ManagePage from "../common/system/manage";
import type { MenuDataItem, ProColumns } from '@ant-design/pro-components';
import AccesslogPage from "../common/public/accesslog";
import DahsboardPage, { dashboardInitialType } from '../common/public/dashboard';
import { verifyToken } from '../common/auth';
import * as cookie from 'cookie';
import Router from "next/router"
export const config = { runtime: 'experimental-edge' };

type SessionDataItem = {
  userid: number;
  username: string;
  useremail: string;
  usertype: number;
  expiretime: number;
};

type DataItem = {
  menuData: MenuDataItem;
  sessionData: SessionDataItem;
}



const loopMenuItem = (menus: any[]): MenuDataItem[] => {

  const IconMap = {
    "dashboard": <DashboardOutlined rev={undefined} />,
    "project": <ProjectOutlined rev={undefined} />,
    "module": <AppstoreAddOutlined rev={undefined} />,
    "accesslog": <IeOutlined rev={undefined} />,
    "manage": <TeamOutlined rev={undefined} />
  };

  return menus.map(({ icon, routes, ...item }) => ({
    ...item,
    icon: icon && IconMap[icon as keyof typeof IconMap],
    children: routes && loopMenuItem(routes),
  }));
};

export type InviteTableListItem = {
  invitecode: string;
  username: string;
  is_used: number;
};

export default function DashBoard({ data }: { data: DataItem }) {
  const [menuLoadding, setMenuLoading] = useState(true);
  const [pathname, setPathname] = useState('/');
  const [dashboardInitialData, setDashboardInitialData] = useState<dashboardInitialType>();
  const [invitecode, setinvitecode] = useState("");
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [addInviteLoadding, setAddInviteLoadding] = useState(false);
  const [deleteInviteLoadding, setDeleteInviteLoadding] = useState(false);

  const InviteTableListColumns: ProColumns<InviteTableListItem>[] = [
    {
      title: "邀请码",
      dataIndex: "invitecode",
      valueType: "text",
    },
    {
      title: "用户名",
      dataIndex: "username",
      valueType: "text",
    },
    {
      title: "使用情况",
      key: "is_used",
      dataIndex: "is_used",
      render: (_, row) => {
        return (
          <Space size={0}>
            <Tag color={row.is_used === 0 ? "green" : "red"} key="is_used_tag">
              {row.is_used === 0 ? "未使用" : "已使用"}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: "删除",
      key: "delete",
      dataIndex: "is_used",
      render: (_, row) => {
        return (
          <Popconfirm
            title="删除邀请码"
            description="删除邀请码"
            onConfirm={async () => await handleDeleteInviteCode(row.invitecode)}
            okButtonProps={{ loading: deleteInviteLoadding }}
            onCancel={() => { setDeleteInviteLoadding(false); }}
            okText="确认"
            cancelText="取消"
            disabled={row.is_used == 1} // 已使用的,禁用按钮
          >
            <Button type="primary" size={'small'} disabled={row.is_used == 1}>
              <DeleteOutlined rev={undefined} />
              删除
            </Button>
          </Popconfirm>
        );
      },
    }
  ];

  async function Logout() {
    try {
      const response = await fetch('/api/user?action=logout');
      if (response.ok) {
        message.success("已退出");
        Router.push('/');
      } else {
        message.warning("退出请求失败");
      }
    } catch (error) {
      message.warning("退出请求失败");
      Router.push('/');
    }
  }

  async function getMenuData(): Promise<MenuDataItem[]> {
    setMenuLoading(true);
    const menuData = loopMenuItem(JSON.parse(JSON.stringify(data.menuData)));
    setMenuLoading(false);
    getDashboardInitialData();
    return menuData;
  }

  async function getDashboardInitialData() {
    const response = await fetch("/api/dashboard");
    const res_json = await response.json();
    const res_message = res_json.message;
    if (response.ok && response.status == 200) {
      setDashboardInitialData(res_json.data);
    } else if (response.status == 401) {
      message.error("登陆状态异常");
      await fetch('/api/user?action=logout');
      Router.push('/');
    } else {
      message.error("获取Dashboard初始化数据失败: " + res_message);
    }

  }

  async function handleModifyUserSubmit(values: any) {
    let new_password = values.new_password;
    let old_password = values.password;
    let useremail = values.useremail;
    try {
      const response = await fetch('/api/user?action=modify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "useremail": useremail,
          "old_password": old_password,
          "new_password": new_password
        }),
      });
      const res_json = await response.json();
      const res_message = res_json.message;
      if (response.ok && response.status == 200) {
        message.success("修改用户信息成功");
        return true;
      } else if (response.status == 401) {
        message.error("登陆状态异常");
        await fetch('/api/user?action=logout');
        Router.push('/');
      } else {
        message.error("修改用户信息失败:" + res_message);
        return false;
      }
    } catch (error) {
      message.error("修改用户信息错误:" + error);
      return false;
    }
  }

  async function handleAddInviteCode() {
    setAddInviteLoadding(true);
    const response = await fetch("/api/invite?action=add")
    const res_json = await response.json();
    const res_message = res_json.message;
    if (response.ok && response.status == 200) {
      setinvitecode(res_json.data.invitecode);
      message.success("邀请码创建成功,该邀请码仅允许一个用户注册");
      setTableRefreshKey((prevKey) => prevKey + 1);
    } else if (response.status == 401) {
      message.error("登陆状态异常");
      await fetch('/api/user?action=logout');
      Router.push('/');
    } else {
      message.error("邀请码创建失败: " + res_message);
    }
    setAddInviteLoadding(false);
  }

  async function handleDeleteInviteCode(invitecode: string) {
    setDeleteInviteLoadding(true);
    const response = await fetch(`/api/invite?action=delete&invitecode=${invitecode}`)
    const res_json = await response.json();
    const res_message = res_json.message;
    if (response.ok && response.status == 200) {
      message.success("邀请码删除成功");
      setTableRefreshKey((prevKey) => prevKey + 1);
    } else if (response.status == 401) {
      message.error("登陆状态异常");
      await fetch('/api/user?action=logout');
      Router.push('/');
    }
    else {
      message.error("邀请码删除失败: " + res_message);
    }
    setDeleteInviteLoadding(false);
  }

  return (
    // <div
    //   id="test-pro-layout"
    //   style={{
    //     height: '100vh',
    //   }}
    // >
      <ProLayout
        fixSiderbar
        location={{
          pathname,
        }}
        loading={menuLoadding}
        menu={{ request: async () => getMenuData() }}
        title="One XSS 管理平台"
        logo="/logo.png"
        avatarProps={{
          // icon: <UserOutlined rev={undefined} />,
          icon: <ModalForm
            title="用户信息修改"
            key="modify_user_modalform"
            autoFocusFirstInput
            modalProps={{
              destroyOnClose: true,
            }}
            submitTimeout={2000}
            onFinish={handleModifyUserSubmit}
            trigger={
              <Tooltip title="用户设置" key="SettingToolTip">
                <UserOutlined key="SettingOutlined" rev={undefined} />
              </Tooltip>
            }
          >
            <ProFormText
              name="username"
              fieldProps={{
                size: 'large',
                prefix: <UserOutlined className={'prefixIcon'} rev={undefined} />,
              }}
              placeholder={'用户名'}
              initialValue={data.sessionData.username}
              disabled
            />
            <ProFormText
              name="useremail"
              fieldProps={{
                size: 'large',
                prefix: <MailOutlined className={'prefixIcon'} rev={undefined} />,
              }}
              placeholder={'邮箱'}
              initialValue={data.sessionData.useremail}
            />
            <ProFormText.Password
              name="password"
              fieldProps={{
                size: 'large',
                prefix: <LockOutlined className={'prefixIcon'} rev={undefined} />,
              }}
              placeholder={'旧密码'}
              rules={[
                {
                  required: true,
                  message: '用户信息编辑操作必须输入旧密码！',
                },
              ]}
            />
            <ProFormText.Password
              name="new_password"
              fieldProps={{
                size: 'large',
                prefix: <LockOutlined className={'prefixIcon'} rev={undefined} />,
              }}
              placeholder={'新密码,不修改请置空'}
              rules={[
                {
                  required: false,
                  message: '请输入新密码',
                },
              ]}
            />
            <ProFormText.Password
              name="new_password_confirm"
              fieldProps={{
                size: 'large',
                prefix: <LockOutlined className={'prefixIcon'} rev={undefined} />,
              }}
              placeholder={'确认新密码,不修改请置空'}
              rules={[
                {
                  required: false,
                  message: '请输入新密码',
                },
              ]}
            />
          </ModalForm>,
          size: 'small',
          title: data.sessionData.username,
        }}
        actionsRender={() => [
          <ModalForm
            title="用户邀请"
            key="invite_user_modalform"
            autoFocusFirstInput
            submitter={false}
            modalProps={{
              destroyOnClose: true,
            }}
            submitTimeout={2000}
            // onFinish={handleInviteUserSubmit}
            trigger={
              <Tooltip title="邀请" key="InviteToolTip">
                <ShareAltOutlined key="InviteOutlined" rev={undefined} />
              </Tooltip>
            }
          >
            <ProForm.Group>
              <Popconfirm
                title="创建邀请码"
                description="每个邀请码仅允许一个用户注册使用"
                // open={addInviteConfirmOpen}
                onConfirm={async () => await handleAddInviteCode()}
                okButtonProps={{ loading: addInviteLoadding }}
                okText="确认"
                cancelText="取消"
                onCancel={() => { setAddInviteLoadding(false); }}
              >
                <Button type="primary">
                  <PlusOutlined rev={undefined} />
                  创建邀请码
                </Button>
              </Popconfirm>
              <Input
                width="md"
                name="invitecode"
                // label="邀请码"
                placeholder={"邀请码"}
                value={invitecode}
                readOnly
              />
            </ProForm.Group>
            <Divider>邀请码使用表</Divider>
            <ProTable
              key={tableRefreshKey}
              columns={InviteTableListColumns}
              rowKey="name"
              search={false}
              options={false}
              pagination={{
                pageSize: 5,
              }}
              request={async (params) => {
                const { pageSize, current } = params;
                const url = `/api/invite?action=list&pageSize=${pageSize}&current=${current}`;
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
              dateFormatter="string" />
          </ModalForm>,
          <Tooltip title="注销" key="LogoutToolTip">
            <LogoutOutlined key="LogoutOutlined" onClick={Logout} rev={undefined} />
          </Tooltip>
        ]}
        menuItemRender={(item, dom) => (
          <a
            onClick={() => {
              setPathname(item.path || '/');
              if (item.path == "/") {
                getDashboardInitialData();
              }
            }}
          >
            {dom}
          </a>
        )}
      >
        {/^\/accesslog\/project-\d+$/.test(pathname) && (
          <AccesslogPage key={pathname} pathname={pathname}></AccesslogPage>
        )}
        {pathname == '/' && dashboardInitialData && (
          // <PageContainer key={pathname}>
          <DahsboardPage key={pathname} DashboardInitialData={dashboardInitialData} />
          // </PageContainer>
        )}
        {pathname == '/project/manage' && (
          <ProjectPage key={pathname} />
        )}
        {pathname == '/module' && (
          <ModulePage key={pathname} sessionData={data.sessionData} />
        )}
        {pathname == '/manage' && (
          <ManagePage key={pathname} sessionData={data.sessionData} />
        )}
      </ProLayout>
    // </div>
  );
};



export async function getServerSideProps(context: any) {
  async function getMenu(userid: number, usertype: number) {
    let defaultMenus = [
      {
        path: '/',
        name: 'Dashboard',
        icon: 'dashboard',
        routes: [
        ]
      },
      {
        path: '/project/manage',
        name: '项目管理',
        icon: 'project',
        routes: [
        ]
      },
      {
        path: '/module',
        name: '模块仓库',
        icon: 'module',
        routes: [
        ]
      }
    ];

    // 管理员用户,添加"用户管理"和"系统设置"
    if (usertype == 1) {
      defaultMenus.push({
        path: '/manage',
        name: '用户管理',
        icon: 'manage',
        routes: [
        ]
      });
    }


    const result = await process.env.DB
      .prepare("SELECT projectid,projectname,projecturl FROM projects WHERE userid=?")
      .bind(userid)
      .all().then((query_result: any) => {
        return query_result.results.map((row: any) => ({
          path: `/accesslog/project-${row.projectid.toString()}`,
          name: row.projectname,
          icon: 'accesslog',
        }));
      }) as { path: string, name: string, icon: string }[];
    if (result.length > 0) {
      defaultMenus.push({
        path: '/accesslog',
        name: '项目日志',
        icon: 'accesslog',
        routes: [
        ]
      });
      const accessLogMenu = defaultMenus.find(menu => menu.path === '/accesslog');
      if (accessLogMenu && accessLogMenu.routes) {
        (accessLogMenu.routes as Array<any>).push(...result);
      }
    }

    return defaultMenus;
  }
  // Token校验过程,校验成功跳转/dashboard
  let sessionData: SessionDataItem;
  if ("cookie" in context.req.headers) {
    try {
      const parsedCookies = cookie.parse(context.req.headers.cookie);
      const verifyResult = await verifyToken(parsedCookies.token);
      if (verifyResult.code == 200 && "userid" in verifyResult.data) {
        sessionData = verifyResult.data;
      } else {
        return {
          redirect: {
            destination: '/',
            permanent: false,
          },
        }
      }
    }
    catch (error) {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      }
    }
  } else {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    }
  }
  // token 验证通过
  const menuData = await getMenu(sessionData.userid, sessionData.usertype);
  const data = { menuData, sessionData };
  return { props: { data } }
}