# Streamline Hub

أريد إنشاء واجهة أمامية (Frontend) للوحة تحكم إدارة تطبيق IPTV باستخدام React.js (يفضل استخدام Vite). 

الهدف من لوحة التحكم هو إدارة الأجهزة وقوائم التشغيل (Playlists) بحيث نتحكم بالتطبيق مركزياً بدلاً من قيام المستخدم بإدخال الرابط بنفسه.

الرجاء الالتزام بالمتطلبات والمواصفات التالية بدقة:

1. التقنيات المطلوبة:

- React.js (Vite)

- TailwindCSS لتنسيق الواجهات (تصميم عصري وجذاب).

- React Router DOM للتنقل بين الصفحات.

- Axios للاتصال بالواجهة الخلفية (NestJS API).

- إعداد لغة الواجهة لتكون باللغة العربية بالكامل (RTL - من اليمين إلى اليسار).

2. الصفحات والمكونات الرئيسية للوحة التحكم:

- صفحة تسجيل الدخول (Login): نموذج بسيط وآمن لدخول الإدارة.

- الصفحة الرئيسية (Dashboard): تعرض إحصائيات سريعة (عدد الأجهزة المسجلة، الأجهزة النشطة، إجمالي قوائم التشغيل).

- إدارة الأجهزة (Devices Management):

  - جدول يعرض جميع الأجهزة (MAC Address، حالة الجهاز، قائمة التشغيل المربوطة به، تاريخ التسجيل).

  - زر لإضافة جهاز جديد (عن طريق إدخال الماك أدرس الخاص به).

  - إمكانية ربط (Link) أو تعديل قائمة تشغيل لجهاز معين.

  - إمكانية حظر أو حذف جهاز.

- إدارة قوائم التشغيل (Playlists Management):

  - جدول يعرض القوائم المتاحة (اسم القائمة، الرابط/البيانات، عدد الأجهزة المرتبطة بها).

  - إمكانية إضافة قائمة تشغيل جديدة (Host, Username, Password).

  - إمكانية تعديل أو حذف القائمة.

3. التصميم وتجربة المستخدم (UI/UX):

- يجب أن يكون التصميم احترافياً، عصرياً، ومريحاً للعين (استخدم درجات ألوان متناسقة، ويفضل توفير الوضع الليلي Dark Mode إن أمكن).

- يجب أن تكون الواجهة متجاوبة بالكامل (Responsive) لتعمل على شاشات الكمبيوتر والأجهزة اللوحية.

- استخدام أيقونات مناسبة (مثل Heroicons أو Lucide-react) لتوضيح القوائم والأزرار.

- إضافة إشعارات (Toasts/Snackbars) عند نجاح أو فشل العمليات (مثل نجاح ربط القائمة بالجهاز).

4. الكود والهيكلة:

- تقسيم المشروع إلى مكونات (Components) قابلة لإعادة الاستخدام.

- إنشاء مجلد `services` يحتوي على إعدادات Axios للتعامل مع الـ Endpoints الخاصة بـ NestJS.

- توفير بيانات وهمية (Mock Data) مؤقتة لاختبار شكل الجداول والواجهات قبل ربطها فعلياً بالـ API.

يرجى كتابة هيكلة المشروع أولاً، ثم تزويدي بأكواد الصفحات والمكونات الأساسية خطوة بخطوة للبدء في بنائها.


اسم اللوحة EN TEC Server

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fee9efd5-2ab4-4a55-b075-b39c32cf0b1b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
