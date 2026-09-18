-- Initial categories requested by the publisher. No sample stories or events.
insert into public.categories(id,slug,name_kn,name_en,sort_order,is_seed) values('00000000-0000-4000-8000-000000000001','news','ಸುದ್ದಿ','News',0,false) on conflict(slug) do nothing;
insert into public.categories(id,slug,name_kn,name_en,sort_order,is_seed) values('00000000-0000-4000-8000-000000000002','pravachana','ಪ್ರವಚನ','Discourses',1,false) on conflict(slug) do nothing;
insert into public.categories(id,slug,name_kn,name_en,sort_order,is_seed) values('00000000-0000-4000-8000-000000000003','utsava','ಉತ್ಸವ','Festivals',2,false) on conflict(slug) do nothing;
insert into public.categories(id,slug,name_kn,name_en,sort_order,is_seed) values('00000000-0000-4000-8000-000000000004','panchakalyana','ಪಂಚಕಲ್ಯಾಣ','Panchakalyana',3,false) on conflict(slug) do nothing;
insert into public.categories(id,slug,name_kn,name_en,sort_order,is_seed) values('00000000-0000-4000-8000-000000000005','chaturmasa','ಚಾತುರ್ಮಾಸ','Chaturmasa',4,false) on conflict(slug) do nothing;
insert into public.categories(id,slug,name_kn,name_en,sort_order,is_seed) values('00000000-0000-4000-8000-000000000006','samaja','ಸಮಾಜ','Community',5,false) on conflict(slug) do nothing;
insert into public.categories(id,slug,name_kn,name_en,sort_order,is_seed) values('00000000-0000-4000-8000-000000000007','basadi','ಬಸದಿಗಳು','Basadis',6,false) on conflict(slug) do nothing;
insert into public.categories(id,slug,name_kn,name_en,sort_order,is_seed) values('00000000-0000-4000-8000-000000000008','acharya','ಆಚಾರ್ಯಶ್ರೀ','Acharya',7,false) on conflict(slug) do nothing;
insert into public.categories(id,slug,name_kn,name_en,sort_order,is_seed) values('00000000-0000-4000-8000-000000000009','muni','ಮುನಿಶ್ರೀ','Muni',8,false) on conflict(slug) do nothing;
insert into public.categories(id,slug,name_kn,name_en,sort_order,is_seed) values('00000000-0000-4000-8000-000000000010','bhattaraka','ಭಟ್ಟಾರಕರು','Bhattaraka',9,false) on conflict(slug) do nothing;
insert into public.categories(id,slug,name_kn,name_en,sort_order,is_seed) values('00000000-0000-4000-8000-000000000011','education','ಶಿಕ್ಷಣ','Education',10,false) on conflict(slug) do nothing;
insert into public.categories(id,slug,name_kn,name_en,sort_order,is_seed) values('00000000-0000-4000-8000-000000000012','programmes','ಕಾರ್ಯಕ್ರಮ','Programmes',11,false) on conflict(slug) do nothing;