
export function isPasswordValid(password:string) {
  // 检查密码长度是否至少为8个字符
  if (password.length < 8) {
    return false;
  }

  // 检查是否至少包含一个数字、一个字母和一个特殊字符
  const hasNumber = /[0-9]/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);

  return hasNumber && hasLetter && hasSpecialChar;
}


function byteStringToUint8Array(byteString: string) {
  const ui = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; ++i) {
    ui[i] = byteString.charCodeAt(i);
  }
  return ui;
}

async function signText(plainData: string) {
  const encoder = new TextEncoder();
  const secretKeyData = encoder.encode(process.env.TOKEN_SALT);
  const key = await crypto.subtle.importKey(
    "raw",
    secretKeyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(plainData)
  );
  let base64Mac = "";
  const dataView = new DataView(mac);
  for (let i = 0; i < mac.byteLength; i++) {
    base64Mac += String.fromCharCode(dataView.getUint8(i));
  }
  base64Mac = btoa(base64Mac);
  // base64Mac = base64Mac.replaceAll("+", "-");
  return base64Mac;
}

async function verifyText(plainData: string, signature: string) {
  const encoder = new TextEncoder();
  const secretKeyData = encoder.encode(process.env.TOKEN_SALT);
  const key = await crypto.subtle.importKey(
    "raw",
    secretKeyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const receivedMac = byteStringToUint8Array(atob(signature));
  const verified = await crypto.subtle.verify(
    "HMAC",
    key,
    receivedMac,
    encoder.encode(plainData)
  );
  return verified;
}

export async function signToken(userid: number, username: string, useremail: string, usertype: string, expiretime: number) {
  return `${userid}::${await signText(`${userid}:${username}:${useremail}:${usertype}:${expiretime}`)}`;
}

export async function verifyToken(cookietoken:string|undefined) {
  try {
    if (cookietoken==null && cookietoken==undefined) {
      let response_header = new Headers();
      {
        response_header.append("Content-Type", "application/json");
        response_header.append("Set-Cookie", `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; HttpOnly; SameSite=Strict; path=/;`);
      }
      return {
        "code": 401,
        "data": new Response(JSON.stringify({ code: 401, message: "Token错误,请重新登陆" }), { status: 401, headers: response_header })
      }
    }
    const token_userid = cookietoken.split('::')[0];
    const token = cookietoken.split('::')[1];

    // 当前userid无token记录
    const _tokenData = await process.env.JSKV.get(`token:${token_userid}`);
    if (_tokenData==null || _tokenData==undefined) {
      let response_header = new Headers();
      {
        response_header.append("Content-Type", "application/json");
        response_header.append("Set-Cookie", `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; HttpOnly; SameSite=Strict; path=/;`);
      }
      return {
        "code": 401,
        "data": new Response(JSON.stringify({ code: 401, message: "Token错误,请重新登陆" }), { status: 401, headers: response_header })
      }
    }
    const tokenData = JSON.parse(_tokenData);
    const plainData = `${tokenData.userid}:${tokenData.username}:${tokenData.useremail}:${tokenData.usertype}:${tokenData.expiretime}`;
    const verified = await verifyText(plainData, token);
    if (!verified || cookietoken != tokenData.token) {
      let response_header = new Headers();
      {
        response_header.append("Content-Type", "application/json");
        response_header.append("Set-Cookie", `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; HttpOnly; SameSite=Strict; path=/;`);
      }
      return {
        "code": 401,
        "data": new Response(JSON.stringify({ code: 401, message: "Token验证失败,请重新登陆" }), { status: 401, headers: response_header })
      }
    }

    if (Date.now() > tokenData.expiretime) {
      await process.env.JSKV.delete(`token:${tokenData.userid}`);
      let response_header = new Headers();
      {
        response_header.append("Content-Type", "application/json");
        response_header.append("Set-Cookie", `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; HttpOnly; SameSite=Strict; path=/;`);
      }
      return {
        "code": 401,
        "data": new Response(JSON.stringify({ code: 401, message: "Token过期,请重新登陆" }), { status: 401, headers: response_header })
      }
    }
    return { "code": 200, "data": tokenData }
  }catch(err:any){
    let response_header = new Headers();
      {
        response_header.append("Content-Type", "application/json");
        response_header.append("Set-Cookie", `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; HttpOnly; SameSite=Strict; path=/;`);
      }
    return {
      "code": 401,
      "data": new Response(JSON.stringify({ code: 401, message: "Token验证失败,请重新登陆" }), { status: 401, headers: response_header })
    }
  }

}

export async function passwordHash(plainData: string) {
  const encoder = new TextEncoder();
  const hashArrayBuffer = (await crypto.subtle.digest("SHA-256", encoder.encode(plainData + process.env.PASSWORD_SALT)));
  const hashArray = Array.from(new Uint8Array(hashArrayBuffer));
  const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
