# Public signing keystore

`mahdi-jym-public.p12` signs the APKs built by `.github/workflows/android-apk.yml` when the
repository has **no** `ANDROID_KEYSTORE_*` secrets. Its password is public (`mahdi-jym-public`,
alias `mahdi-jym`) — it exists so that every CI build carries the *same* signature, which is
what lets Android install an update over the previous version without wiping the app's data.

Because the key is public, anyone could sign an APK that Android would accept as an "update".
Only install MAHDI-JYM from the official GitHub Releases / https://m777m44.github.io/Heroes-Jym/, and before handing
the app to other people switch to a private key (see `docs/MOBILE.md` → *Signing*).

Certificate SHA-256:
`73:57:F6:D6:ED:71:B6:22:0F:28:E0:B0:8B:BA:C6:5E:E0:EB:05:9B:C1:A3:42:4B:F2:78:15:F7:05:EA:F2:AE`
