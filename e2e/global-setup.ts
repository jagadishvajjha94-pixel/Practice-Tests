const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';

const WARMUP_PATHS = ['/', '/auth/role', '/auth/login/student', '/placement'];

export default async function globalSetup() {
  for (const path of WARMUP_PATHS) {
    const url = `${baseURL}${path}`;
    let ready = false;
    for (let attempt = 0; attempt < 45; attempt++) {
      try {
        const res = await fetch(url, { redirect: 'follow' });
        if (res.ok) {
          ready = true;
          break;
        }
      } catch {
        // server still starting or compiling
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!ready) {
      throw new Error(`E2E warmup failed for ${url}`);
    }
  }
}
