import React from 'react';
import Head from 'next/head';
import PlatformLoginForm from "../common/login";
import * as cookie from 'cookie';
import { verifyToken } from '../common/auth';
import { InferGetServerSidePropsType } from 'next';
import InstallForm from '../common/install';

export const config = { runtime: 'experimental-edge' };

export default function Home({ data }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>One XSS</title>
      </Head>
      <div
        style={{
          // backgroundColor: 'white',
          // height: '100vh',
          // width: '100vw',
          // margin: 0,
          // padding: 0,
          // color: 'black',
        }}
      >
        <PlatformLoginForm />
        {data.installed.status == false && <InstallForm kv_status={data.installed.kv_status} db_status={data.installed.db_status} passwordsalt_status={data.installed.passwordsalt_status} tokensalt_status={data.installed.tokensalt_status} />}
      </div>
    </>
  );
}

export async function getServerSideProps(context: any) {
  async function checkKVStatus() {
    try {
      await process.env.JSKV.put("test", "123456");
      if ("123456" == await process.env.JSKV.get("test")) {
        return true;
      }
      return false;
    }
    catch (error) {
      return false;
    }
  }
  async function checkDBStatus() {
    try {
      let db_result = await process.env.DB
        .prepare("SELECT 123456 AS test")
        .first().then((query_result: any) => {
          return query_result.test;
        });
      if (db_result == 123456) {
        return true;
      }
      return false;
    }
    catch (error) {
      return false;
    }
  }
  async function checkInstall() {
    let installStatus = false;
    try {
      let installed = await process.env.DB.prepare("SELECT configvalue FROM config WHERE configname = 'installed'")
        .first().then((query_result: any) => {
          return query_result.configvalue;
        });
      if (installed == 'installed') {
        installStatus = true;
      }
    } catch (error) {
      installStatus = false;
    }
    return installStatus;
  }
  function checkTokenSalt(){
    if(process.env.TOKEN_SALT != undefined && process.env.TOKEN_SALT.length>=8){
      return true;
    }
    return false;
  }
  function checkPasswordSalt(){
    if(process.env.PASSWORD_SALT != undefined && process.env.PASSWORD_SALT.length>=8){
      return true;
    }
    return false;
  }

  // 校验安装状态
  const installed_status = await checkInstall();
  let installed;
  if (installed_status == false) {
    installed = {
      "status": false,
      "kv_status": await checkKVStatus(),
      "db_status": await checkDBStatus(),
      'passwordsalt_status' : checkPasswordSalt(),
      'tokensalt_status': checkTokenSalt()
    }
  } else {
    installed = {
      "status": true,
      "kv_status": true,
      "db_status": true,
      'passwordsalt_status' : true,
      'tokensalt_status': true
    }
  }
  // Token校验过程,校验成功跳转/dashboard
  if (installed.status && "cookie" in context.req.headers) {
    try {
      const parsedCookies = cookie.parse(context.req.headers.cookie)
      const verifyResult = await verifyToken(parsedCookies.token);
      if (verifyResult.code == 200 && "userid" in verifyResult.data) {
        return {
          redirect: {
            destination: '/dashboard',
            permanent: false,
          },
        }
      }
    }
    catch (error) {
    }
  }

  const data = { "installed": installed };
  return { props: { data } };
}