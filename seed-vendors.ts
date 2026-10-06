import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rawData = `
Johan Hariyanto	BCA 	307-0100-893
Yohan Sofyan	BCA	460 133 9107
Gunawan Taswin	BCA	108 197 2333
Darell Karya	BCA	604 344 3572
Saji	BCA	824-106-8846
Udraji Gunawan	BCA	346-2466-541
Mujiono	BCA	864-1051-837
Rizky Yustisiawan Sitanggang	BCA	567-611-9589
Baldwin Kurniawan	BCA	535-011-9908
PT. Anekajaya Langgengsentosa	BRI	0441-0116-1616-308
PT. Gloria Mulya Jaya	BCA	809-080-0087
PT. Sankeindo ( BRI )	BRI	0332-0100-1834-302
PT. Sankeindo ( BNI )	BNI	0185-913-474
PT. Sankeindo ( BCA )	BCA	218-302-4191
Daffa Earin Alghazali	BCA	604-246-2311
Maun	BCA	097-100-3455
Firman Nurwegian	BCA	309-110-6637
PT. Pionir Elektrik Indonesia	BCA	0686-888-660
CV. Pionir Elektrik Jakarta	ICBC	01200-200-00000-713584
PT. Megah Surya Transportasindo	BCA	397-6777-682
PT. Graha Persada Internasional	BCA	2210-7777-79
David Karya 	BCA	6040-111-997
Xiamen LK Trading Co.,Ltd	China Ever Bright Bank	8088-1000-0000-4219
Bertabur Kasih Bojonegoro	BRI 	0011-01-002782-562
Berkah Galuh Peduli	BTN	0120-0013-0000-0367
Wuxi Purite  Import & Export Co.Ltd	Bank of Ningbo Co	86020000023888888
PT. Anugrah Gabung Berdikari Utama	BRI	0005-0100-5241-568
Surya Atmadjaya	BCA	6040-99-1717
Penerimaan Negara	BRI - Kode Billing	6402-6050-4931-745
PT. Dewenei Trans Indonesia	BCA	829-169-9499
Ahmad Baidlowi	BCA	089-091-7232
PT. Tera Forwarders Indonesia	BCA	582-045-5721
Gunajaya Mandiri Computer	BCA	108-197-2333
PT. Prima Mira Bersama	BCA	497-257-9789
PT. Legenda Bintang Bola	BNI	648-999-9997
Ari Riatna Gustika	BCA	748-539-5709
DHL	BCA	537-028-8862
PT. Mitra Pinasthika Mustika Rent	BCA - Virtual Account	002-290-001-2363
Mujiono ( BNI )	BNI	188-941-3497
Moch Ardhiyanshah	BCA	0890-827-861
PT. BSD Diamond Development Pengelola Kawasan The ZORA		
Ade Tatang	Mandiri	900-001-115-1942
Direktorat Jenderal Bea dan Cukai	BCA - Kode Billing	
William Ong	BCA	497-755-5778
PT. Dwicipta Surya Abadi	BCA	604-485-5482
PT. Aneka Jaya Langgeng Sentosa	BCA	659-036-6241
Agus Budiono Kuncoro	BCA	426-776-8888
Anhui Import & Export Co.,Ltd.	China Ever Bright Bank	7667-0188-0000-20831
My Republic	BCA - Virtual Account	100-520-035-66147
PLN Mobile	BCA - Virtual Account	20500-10017872418
PT. Sumber Digital Media	BCA	082-301-9278
BPJS Ketenagakerjaan	Kode Billing	4251-0904-7000
Direktorat Jendal Pajak	Kode Billing	
H Sala Susanto	BCA	343-070-2962
Sulistiyono	BCA	836-508-7438
Sarwan	BRI	656-701-007-051-535
Liesyia Kartansa	BCA - Virtual Account	2028-5202-8511-00584
Jepat Rahmat Hidayat	BRI	676-001-007-360-534
PT. Visi Citrawisata	BCA	168-307-9590
Larasati Khairunnisa	BCA	206-048-6193
Ende Suhermawan	BCA	833-040-6667
Al Fudin	BRI	3659-0102-4240-531
PT. Media Baja Cemerlang	BCA	702-574-7747
Wong Tjun Sien	BCA	883-098-1200
PT. Buana Indomobil Trada	BCA	716-027-7101
Koperasi PSU Sumber	BRI	0007-01-002940-56-9
CV. King Arkha Perkasa	BTN	810-130-000-2798
Nirfa Agra Mandiri	BRI	0133-0100-2006-560
Anjar	BCA	199-119-2781
Hasan Tanadi	BCA	874-030-9979
Siska Widyawati	BRI	6571-0102-4623-532
Faturrohman	BCA	0241-752-509
Harji	BRI	6565-0100-8206-533
Sumanto	BCA	577-157-3224
Setia Usaha Nusantara CV	BCA	784-175-3333
Terminal Intimoda Utama	BNI	211-888-5952
Sphere Global Solusi		
Syarifuddin Adi Zulkarnain	BCA	316-130-1637
Yayasan Insan Emas Madani 	BRI	0007-01-004632-308
Yayasan Putra Bangsa Jaya	BRI	0007-01-004635-306
PT Distribution Center	BCA	864-108-7033
PT. Kalista Pesona Zora	BCA	237-3308-811
Liesyia Kartansa ( PAM )	BCA - Virtual Account	200-480-047-676
		3816-5592-5999-4769
PT. Prima Pinasthika Mustika Rent	BCA - Virtual Account	002-290-001-2363
PT. Prima Mira Bersama ( BRI )	BRI	0509-0100-3205-300
Xiamen LK Trading Co.Ltd	China Merchants Bank	592909352410007
Farhan A Taqi	BCA	7310605420
Ong Ka Mei	BCA	4977030802
Michael Suryono Halim	BCA	870-51-008-25
CV. Sartika		
CV. Karya Makmur		
PT. Anugrah Gabung Berdikari Utama ( BNI )	BNI	198-923-1323
Waruju Aris	BCA	239-0327-679
Yuki S.Ds Yapkienyan	BCA	008-630-6161
Nana Ratmaja	Mandiri	132-00-2298249-1
James Rasyid Flokstra	BCA	2231807691
Enrico Putra K	BCA	143-0705-829
Djony Sudarto Wiratmo	BCA	106-2184-757
Mohamad Mardiyono 	BCA	701-0351-485
Riyanto	BRI	5983-0101-5120-535
Febrianto	BCA	682-068-1591
Ferry Ruswandi	BCA	777-196-0255
PT. Prima Mira Bersama ( BNI )	BNI	201-866-5951
PT. Prima Mira Bersama ( BTN )	BTN	0016201300012008
PT. Prima Mira Bersama ( Mandiri )	Mandiri	1640007306519
`;

async function main() {
  // Clear any existing wrongly inserted vendors
  await prisma.masterVendor.deleteMany();
  console.log('Cleared existing vendors.');

  const lines = rawData.split('\n').filter(line => line.trim().length > 0);
  
  for (const line of lines) {
    const parts = line.split('\t').map(p => p.trim());
    if (parts.length === 0 || !parts[0]) continue;
    
    // First part is account name / vendor name
    const accountName = parts[0];
    const bankName = parts.length > 1 ? parts[1] : '';
    const accountNumber = parts.length > 2 ? parts[2] : '';
    
    if (accountName && bankName && accountNumber) {
      await prisma.masterVendor.create({
        data: {
          name: accountName,
          accountName: accountName,
          bankName: bankName,
          accountNumber: accountNumber,
        }
      });
      console.log(`Created vendor: ${accountName}`);
    } else if (accountName) {
      await prisma.masterVendor.create({
        data: {
          name: accountName,
          accountName: accountName,
          bankName: bankName || '-',
          accountNumber: accountNumber || '-',
        }
      });
      console.log(`Created vendor without bank: ${accountName}`);
    }
  }

  console.log('Finished seeding vendors.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
