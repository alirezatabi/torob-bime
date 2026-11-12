# راهنمای Windows و PostgreSQL محلی

این مراحل برای Windows 10/11، PowerShell، Node.js 22 و npm 10 و PostgreSQL محلی نوشته شده‌اند؛ **Docker لازم نیست**. اجرای بومی Windows در محیط ساخت این نسخه در دسترس نبود، پس مراحل زیر نیازمند تأیید روی دستگاه شما هستند. حداقل نسخهٔ پشتیبانی‌شدهٔ Node، نسخهٔ 20.19 است.

## ۱. ابزارها و پایگاه داده

Node.js 22 و PostgreSQL را نصب کنید، یک ترمینال جدید باز کنید و اجرا کنید:

```powershell
node --version
npm --version
psql --version
```

اگر `psql` در PATH نیست، از pgAdmin یا مسیر `bin\psql.exe` نصب PostgreSQL استفاده کنید. سرویس PostgreSQL را در Services روشن کنید. در pgAdmin یک پایگاه دادهٔ UTF-8 به نام `torob_bime` بسازید یا با کاربری دارای اجازهٔ ساخت پایگاه داده اجرا کنید:

```powershell
psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "CREATE DATABASE torob_bime WITH ENCODING 'UTF8' TEMPLATE template0;"
```

نام کاربر و پورت ممکن است روی دستگاه شما متفاوت باشند. رمز را فقط در prompt خود PostgreSQL وارد کنید، نه در فایل‌های مخزن یا گفتگو.

## ۲. نصب و تنظیم محلی

```powershell
git clone https://github.com/alirezatabi/torob-bime.git
cd torob-bime
npm ci
Copy-Item .env.example .env.local
notepad .env.local
```

در `.env.local` مقدار `DATABASE_URL` را با مقدار واقعی محیط خود جایگزین کنید، مثلاً:

```dotenv
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/torob_bime?schema=public"
```

`YOUR_PASSWORD` فقط placeholder است. نویسه‌های ویژهٔ نام کاربری و رمز باید URL-encode شوند؛ مثلاً `@` به `%40` و `#` به `%23` تبدیل می‌شود. `.env.local` در Git نادیده گرفته می‌شود. Next، اسکریپت‌ها و CLI پرایزما آن را با `@next/env` می‌خوانند؛ متغیر محیطی موجود بر فایل مقدم است و `.env.local` پیش از `.env` خوانده می‌شود.

```powershell
npm run db:deploy
npm run db:seed
npm run dev
# در مرورگر: http://localhost:3000
```

seed، ۱۲ طرح ساختگی را در **پایگاه دادهٔ انتخاب‌شده** می‌نویسد. برای خروج `Ctrl+C` بزنید. `npm ci` و `npm run build` از دستور استاندارد `prisma generate` استفاده می‌کنند؛ دریافت موتور سازگار Prisma به دسترسی به CDN آن نیاز دارد. در این sandbox اتصال TLS به آن CDN مسدود بود، بنابراین نصب تمیز شبکه‌دار هنوز باید روی سیستم شما آزموده شود.

اگر PowerShell اجرای `npm.ps1` را با Execution Policy مسدود کرد، به‌جای تغییر سیاست سراسری از `npm.cmd ci` و `npm.cmd run dev` استفاده کنید.

## فقط نمایش آفلاین، بدون PostgreSQL

بدون ساخت `.env.local` یا با خالی‌گذاشتن `DATABASE_URL` و حذف متغیر محیطی همنام، `npm ci` و `npm run dev` کافی است. کاتالوگ در حافظه است؛ در نبود اسنپ‌شات معتبر، استخراج قانون‌محور است و نتیجهٔ مدل نیست. برای حذف متغیر فعلی از همان PowerShell در صورت وجود:

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
```

اگر قبلاً `.env` ساخته‌اید، مقدار `DATABASE_URL` آن را نیز خالی کنید؛ در غیر این صورت خوانده خواهد شد.

## رفع خطا

- `P1001`: سرویس PostgreSQL، میزبان، پورت و firewall را بررسی کنید.
- `P1000`: کاربر، رمز و URL-encoding را بررسی کنید.
- `P1003`: مطمئن شوید نام پایگاه داده درست است و آن را ساخته‌اید.
- خطای دانلود موتور Prisma: دسترسی شبکه به `binaries.prisma.sh`، پروکسی سازمانی و گواهی TLS سیستم را بررسی کنید؛ موتور جعلی یا override به Node نگذارید.
- اگر فایل `.env.local` را تغییر دادید، سرور dev و دستورهای CLI را مجدداً اجرا کنید تا محیط تازه بارگذاری شود.

## تست‌ها و دادهٔ موقت

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run eval
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:e2e:mock-ai
```

دو تست واحد DB بدون `TEST_DATABASE_URL` نادیده گرفته می‌شوند. برای اجرای آن‌ها یک پایگاه دادهٔ **موقت و اختصاصی** بسازید، آن را با `npm run db:deploy` مهاجرت دهید و مقدار `TEST_DATABASE_URL` را در یک ترمینال جدا به همان DB بدهید؛ هرگز DB واقعی یا اشتراکی را برای این تست انتخاب نکنید. تست مرورگرِ شاهدهای هم‌پوشان نیز وقتی اجرا می‌شود که `DATABASE_URL` و `TEST_DATABASE_URL` یکسان و سرور محلی باشند. این پایگاه دادهٔ موقت را با `npm run db:seed` پر کنید. تست‌ها رکوردهای موقت ساخته‌شدهٔ خود را پاک می‌کنند.

## Anthropic و اسنپ‌شات

کلید را فقط در `.env.local` یا متغیر محیطی امن خود بگذارید و `LLM_MODEL` را نیز تنظیم کنید. این‌ها اختیاری‌اند؛ نام مدل صرفاً از محیط خوانده می‌شود. اجرای اسنپ‌شات به API واقعی متصل و ممکن است هزینه‌بر باشد:

```powershell
npm run snapshot
npm run snapshot -- --eval
npm run eval -- --snapshot
```

پس از تولید اسنپ‌شات کاتالوگ، در حالت DB دوباره `npm run db:seed` و سپس `npm run build`/`npm run start` را اجرا کنید. از `npm run eval -- --live` فقط وقتی از هزینه و ارسال متن‌های مصنوعی به سرویس مطلع هستید استفاده کنید. هیچ کلید، اطلاعات شخصی یا متن حساس را در مخزن ثبت نکنید. [توضیحات کامل در README](../README.md).
