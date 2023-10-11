import { ApiOutlined, LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import {
  ProFormSwitch,
  ProFormText,
  StepsForm,
} from '@ant-design/pro-components';
import { Alert, message, Modal } from 'antd';
import { useState } from 'react';

export default function InstallForm({ kv_status, db_status, passwordsalt_status, tokensalt_status }: { kv_status: boolean, db_status: boolean, passwordsalt_status: boolean, tokensalt_status: boolean }) {
  const [installVisible, setInstallVisible] = useState(true);
  return (
    <StepsForm
      current={kv_status && db_status && passwordsalt_status && tokensalt_status ? 1 : 0}
      onFinish={async (values) => {
        try {
          const response = await fetch('/api/install', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(values),
          });

          if (response.ok && response.status==200) {
            message.success('系统安装成功');
            setInstallVisible(false);
            return true;
          } else {
            message.warning('系统安装失败');
            return false;
          }
        } catch (error) {
          message.error('连接失败,请检查网络');
          return false;
        }
      }}
      formProps={{
        validateMessages: {
          required: '此项为必填项',
        },
      }}
      stepsFormRender={(dom, submitter) => {
        return (
          <Modal
            title="系统安装"
            width={800}
            closable={false}
            open={installVisible}
            footer={submitter}
            destroyOnClose
          >
            {dom}
          </Modal>
        );
      }}
    >
      <StepsForm.StepForm
        name="base"
        title="环境检测"
        onFinish={async () => {
          if (kv_status && db_status && passwordsalt_status && tokensalt_status) {
            return true;
          } else {
            message.error("请确认KV和DB绑定完成,且绑定后需要重新部署项目(SALT环境变量配置不需要重新部署)");
            return false;
          }
        }}
      >
        {passwordsalt_status && <Alert message="PASSWORD SALT环境变量检测正常" type="success" showIcon />}
        {!passwordsalt_status && <Alert
          message="PASSWORD SALT环境变量检测异常"
          description="请在Pages设置中,正确配置环境变量,名称为'PASSWORD_SALT',内容随机且长度不小于8位"
          type="error"
          showIcon
        />}
        {tokensalt_status && <Alert message="TOKEN SALT环境变量检测正常" type="success" showIcon />}
        {!tokensalt_status && <Alert
          message="TOKEN SALT环境变量检测异常"
          description="请在Pages设置中,正确配置环境变量,名称为'TOKEN_SALT',内容随机且长度不小于8位"
          type="error"
          showIcon
        />}
        {kv_status && <Alert message="KV检测正常" type="success" showIcon />}
        {!kv_status && <Alert
          message="KV状态异常"
          description="请在Pages设置中,正确配置'KV 命名空间绑定',变量名称为'JSKV'"
          type="error"
          showIcon
        />}
        {db_status && <Alert message="DB检测正常" type="success" showIcon />}
        {!db_status && <Alert
          message="DB状态异常"
          description="请在Pages设置中,正确配置'D1 数据库绑定',变量名称为'DB'"
          type="error"
          showIcon
        />}
        {(!db_status || !kv_status) && <Alert
          message="系统提示"
          description="当配置KV和DB绑定完成后,需重新部署项目"
          type="warning"
          showIcon
        />
        }
      </StepsForm.StepForm>
      <StepsForm.StepForm name="checkbox" title="设置参数">
        <ProFormText
          name="domain"
          fieldProps={{
            size: 'large',
            prefix: <ApiOutlined className={'prefixIcon'} rev={undefined} />,
          }}
          placeholder={'JS接口域名'}
          rules={[
            {
              required: true,
              message: '请输入域名！',
            },
            {
              pattern: /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,63}(\/\S*)?$/,
              message: '请输入有效的域名地址！',
            },
          ]}
        />

        <ProFormSwitch
          label="导入推荐模块"
          name="module_import"
          tooltip="导入常用的多个模块,若关闭,则系统默认无任何模块"
          initialValue={true}
        />
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
            },
            {
              pattern: /^[a-zA-Z0-9]+$/,
              message: '用户名只能包含字母和数字！',
            },
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

      </StepsForm.StepForm>
    </StepsForm>
  );
};