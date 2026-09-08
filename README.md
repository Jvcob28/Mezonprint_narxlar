# Mezon Print Demo — o‘zbekcha lotin versiyasi

Backend va PostgreSQLsiz sinov frontend.

## Ishga tushirish

1. Arxivni oching.
2. `index.html`, `styles.css` va `app.js` fayllarini bitta papkaga joylashtiring.
3. `index.html` faylini Chrome yoki Edge brauzerida oching.

## Nimalar ishlaydi

- rangli va oq-qora chop etish kalkulyatsiyasi;
- A6, A5, A4, A3 va SRA3 formatlari;
- tiraj oralig‘ini avtomatik aniqlash;
- minimal, standart va maksimal narx;
- kelishilgan tiraj uchun qo‘lda narx;
- ikki tomonlama chop etish;
- to‘liq rangli qoplama;
- shoshilinch buyurtma;
- kesish;
- bigovka;
- laminatsiya;
- rang tanlash;
- bitta buyurtmaga bir nechta pozitsiya qo‘shish;
- chegirma;
- qisman to‘lov;
- qarzdorlik;
- ichki xarajatlar;
- foyda va marja hisoblash;
- buyurtmalarni localStorage’da saqlash;
- qoralamani avtomatik tiklash;
- buyurtmalar tarixi va qidiruv;
- mijozlar ro‘yxati;
- noyob buyurtma raqami;
- Code 39 shtrix-kodi;
- faqat chekni 80 mm formatda chop etish;
- saqlangan buyurtma chekini qayta chop etish;
- ustama va xizmatlar sozlamalari.

## Chekni chop etish

**“Chekni chop etish”** tugmasi butun dastur sahifasini chop etmaydi.

JavaScript alohida vaqtinchalik chop etish oynasini yaratadi. Unda faqat quyidagilar bo‘ladi:

- MEZON PRINT;
- buyurtma raqami;
- sana;
- mijoz;
- telefon;
- buyurtma pozitsiyalari;
- qo‘shimcha xizmatlar;
- oraliq jami;
- chegirma;
- jami;
- to‘langan summa;
- qoldiq;
- to‘lov usuli;
- to‘lov izohi;
- buyurtma izohi;
- shtrix-kod.

Shundan keyin brauzerning standart chop etish oynasi ochiladi.

## Buyurtma bilan birga chekni saqlash

Har bir yangi saqlangan buyurtmada `receiptSnapshot` mavjud.

U buyurtma rasmiylashtirilgan paytdagi chek holatini saqlaydi:

- `orderNo`;
- `createdAt`;
- `customer`;
- `payment`;
- `discount`;
- `note`;
- `items`;
- `totals`.

Shu sababli keyinchalik prays yoki sozlamalar o‘zgarsa ham oldingi saqlangan chek o‘zgarmaydi.

## Buyurtmalar bo‘limi

**Buyurtmalar** bo‘limida:

- buyurtmani ochish;
- saqlangan chekni ko‘rish;
- to‘lov ma’lumotlarini ko‘rish;
- aynan shu eski chekni qayta chop etish mumkin.

## To‘lov ma’lumotlari

Quyidagilar saqlanadi:

- to‘lov usuli;
- to‘lov izohi;
- to‘langan summa;
- qoldiq.

## Eski demo buyurtmalari bilan moslik

Birinchi demo versiyasida yaratilgan buyurtmalar ham ochiladi. Agar ularda `receiptSnapshot` bo‘lmasa, dastur eski buyurtma maydonlaridan chek ma’lumotlarini yig‘adi.

## Muhim

Bu hali haqiqiy ma’lumotlar bazasi emas. Hozir ma’lumotlar brauzerning `localStorage` xotirasida turadi.

Keyingi bosqichda shu buyurtma modeli va `receiptSnapshot` strukturasini PostgreSQL bazasiga ko‘chirish mumkin. Shunda bir nechta xodim bir vaqtning o‘zida ishlashi va barcha buyurtmalar markaziy bazada saqlanishi mumkin.

> Eslatma: asl prays suratida oq-qora chop etish uchun 101–200 dona oralig‘i aniq ko‘rsatilmagan. Demo versiyada hisoblash uzilmasligi uchun 11–100 oralig‘i vaqtincha 200 donagacha davom ettirilgan.
