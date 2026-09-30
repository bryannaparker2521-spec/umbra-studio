export const UMBRA_CLOUD_URL =
  "https://umbra-studio-cloud.bryannaparker2521-d60.workers.dev";

export interface UmbraCloudUser {
  id: string;
  email: string | null;
  displayName: string | null;
  role: "primary_admin" | "admin" | "editor";
}
export interface UmbraCloudSession {
  user: { id: string; email: string | null };
}
export interface UmbraCloudMediaUploadResponse {
  ok: true; key: string; url: string; size: number; contentType: string;
}
const TOKEN_KEY="umbra-studio-auth-token";
const USER_KEY="umbra-studio-auth-user";

export function getStoredUmbraSession(): UmbraCloudSession|null {
  const token=localStorage.getItem(TOKEN_KEY),raw=localStorage.getItem(USER_KEY);
  if(!token||!raw)return null;
  try{const user=JSON.parse(raw) as UmbraCloudUser;return {user:{id:user.id,email:user.email}};}catch{return null;}
}
function getToken():string {
  const token=localStorage.getItem(TOKEN_KEY);
  if(!token)throw new Error("You must be signed in to use Umbra Studio Cloud.");
  return token;
}
export async function signInUmbraCloud(email:string,password:string):Promise<UmbraCloudSession>{
  const response=await fetch(`${UMBRA_CLOUD_URL}/api/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
  const body=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(body?.error||`Umbra Studio sign in failed (${response.status}).`);
  localStorage.setItem(TOKEN_KEY,body.token); localStorage.setItem(USER_KEY,JSON.stringify(body.user));
  return {user:{id:body.user.id,email:body.user.email}};
}
export async function activateUmbraCloudAccount(email:string,code:string,password:string):Promise<void>{
  const response=await fetch(`${UMBRA_CLOUD_URL}/api/auth/activate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,code,password})});
  const body=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(body?.error||`Umbra Studio account setup failed (${response.status}).`);
}
export async function signOutUmbraCloud():Promise<void>{
  const token=localStorage.getItem(TOKEN_KEY);
  try{if(token)await fetch(`${UMBRA_CLOUD_URL}/api/auth/logout`,{method:"POST",headers:{Authorization:`Bearer ${token}`}});}finally{localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(USER_KEY);}
}
export async function uploadUmbraCloudMedia(file:File,category:string,ownerId?:string):Promise<UmbraCloudMediaUploadResponse>{
  const form=new FormData();form.append("file",file);form.append("category",category);if(ownerId)form.append("ownerId",ownerId);
  const response=await fetch(`${UMBRA_CLOUD_URL}/api/media/upload`,{method:"POST",headers:{Authorization:`Bearer ${getToken()}`},body:form});
  const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.error||`Umbra Studio media upload failed (${response.status}).`);return body;
}
export async function umbraCloudFetch<T>(path:string,init:RequestInit={}):Promise<T>{
  const response=await fetch(`${UMBRA_CLOUD_URL}${path.startsWith("/")?path:`/${path}`}`,{...init,headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`,...(init.headers??{})}});
  const body=await response.json().catch(()=>null);
  if(!response.ok){if(response.status===401){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(USER_KEY);}throw new Error(body?.error||`Umbra Studio Cloud request failed (${response.status}).`);}
  return body as T;
}
export async function getUmbraCloudUser():Promise<UmbraCloudUser>{const r=await umbraCloudFetch<{ok:true;user:UmbraCloudUser}>("/api/me");return r.user;}
