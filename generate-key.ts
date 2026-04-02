import { execSync } from 'child_process';

try {
  // Remove existing if any
  try { execSync('rm android/app/upload-keystore.jks'); } catch(e){}

  // Generate keystore
  execSync('keytool -genkey -v -keystore android/app/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload -storepass rumawater123 -keypass rumawater123 -dname "CN=Ruma Water, OU=App, O=Ruma, L=City, ST=State, C=US"');
  
  // Get fingerprints
  const output = execSync('keytool -list -v -keystore android/app/upload-keystore.jks -alias upload -storepass rumawater123 -keypass rumawater123').toString();
  console.log("SUCCESS_OUTPUT:");
  console.log(output);
} catch (e: any) {
  console.error("FAILED:", e.message);
  if (e.stdout) console.log("STDOUT:", e.stdout.toString());
  if (e.stderr) console.log("STDERR:", e.stderr.toString());
}
