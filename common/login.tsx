import { LockOutlined, MailOutlined, ShareAltOutlined, UserOutlined } from '@ant-design/icons';
import { LoginFormPage, ProFormText } from '@ant-design/pro-components';
import { message, Tabs } from 'antd';
import Router from "next/router"
import { useState } from 'react';
import React from 'react';
type LoginType = 'signin' | 'signup';

const waitTime = (time: number = 100) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, time);
  });
};

export default function PlatformLoginForm() {
  const [loginType, setLoginType] = useState<LoginType>('signin');
  const tab_items = [
    { key: 'signin', label: "登录", children: "" },
    { key: 'signup', label: "注册", children: "" }
  ]
  const handleSubmit = async (values: any) => {
    if (loginType == "signin") {
      try {
        const response = await fetch('/api/user?action=signin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });
        const res_json = await response.json();
        const res_message = res_json.message;
        if (response.ok && response.status==200) {
          message.success('登录成功,正在跳转');
          await waitTime(1000);
          Router.push('/dashboard');
        } else {
          message.warning('登录失败: '+res_message);
        }
      } catch (error) {
        message.error('连接失败,请检查网络');
      }
    }
    if (loginType == "signup") {
      try {
        const response = await fetch('/api/user?action=signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });
        const res_json = await response.json();
        const res_message = res_json.message;
        if (response.ok && response.status==200) {
          message.success('注册成功,正在跳转');
          await waitTime(1000);
          Router.push('/dashboard');
        } else {
          message.warning('注册失败: '+res_message);
        }
      } catch (error) {
        message.error('连接失败,请检查网络');
      }
    }

  };

  return (
    <LoginFormPage
      backgroundImageUrl="/backgroundImage.png"
      logo="/logo.png"
      title="One XSS"
      subTitle="用于渗透测试人员使用的XSS平台"
      onFinish={handleSubmit}
    >
      <Tabs defaultActiveKey='0' items={tab_items} onChange={(activeKey) => setLoginType(activeKey as LoginType)} />
      {loginType === 'signin' && (
        <>
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
            placeholder={'密码'}
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
        </>
      )}
      {loginType === 'signup' && (
        <>
          <ProFormText
            name="username"
            fieldProps={{
              size: 'large',
              prefix: <UserOutlined className={'prefixIcon'} rev={undefined} />,
            }}
            placeholder={'注册用户名'}
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
          <ProFormText
            name="invitecode"
            fieldProps={{
              size: 'large',
              prefix: <ShareAltOutlined className={'prefixIcon'} rev={undefined} />,
            }}
            placeholder={'注册邀请码'}
            rules={[
              {
                required: true,
                message: '请输入邀请码!',
              },
            ]}
          />
        </>
      )}
      {/* <Button type="primary" onClick={handleSubmit}>
          {submitText}
        </Button> */}
      {/* <Link style={{ float: 'right', marginBottom: '20px' }} href="/">
          忘记密码
        </Link> */}
    </LoginFormPage>
  );
};
