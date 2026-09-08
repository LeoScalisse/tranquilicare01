-- IMPACT SCALE / ESCALA HUMANA
-- Monetary amounts and quantities use integers (cents and thousandths) to keep
-- calculations deterministic and auditable.

create table if not exists public.impact_units (
  key text primary key,
  category text not null check (category in ('education','health','mental_health','social','pets','environment')),
  singular text not null check (length(trim(singular)) > 0),
  plural text not null check (length(trim(plural)) > 0),
  unit_type text not null default 'discrete' check (unit_type in ('discrete','continuous')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (category, key)
);

create table if not exists public.organization_impact_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null check (category in ('education','health','mental_health','social','pets','environment')),
  impact_unit_key text not null,
  base_amount_cents integer not null check (base_amount_cents > 0),
  base_quantity_milli integer not null check (base_quantity_milli > 0),
  source_description text not null check (length(trim(source_description)) >= 10),
  is_active boolean not null default true,
  is_verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category, impact_unit_key) references public.impact_units(category, key),
  unique (organization_id, impact_unit_key)
);

create table if not exists public.impact_reference_constants (
  key text primary key,
  label text not null,
  value_milli bigint not null check (value_milli > 0),
  unit text not null,
  source_description text not null,
  source_url text not null check (source_url ~ '^https://'),
  is_estimate boolean not null default true,
  active boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.impact_scale_relations (
  key text primary key,
  category text not null check (category in ('education','health','mental_health','social','pets','environment')),
  impact_unit_key text not null,
  template text not null check (length(trim(template)) > 0),
  reference_key text,
  is_estimate boolean not null default false,
  editorial_status text not null default 'draft' check (editorial_status in ('draft','approved','rejected')),
  active boolean not null default false,
  priority smallint not null default 100,
  created_at timestamptz not null default now(),
  foreign key (category, impact_unit_key) references public.impact_units(category, key)
);

create table if not exists public.impact_city_references (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  state text not null,
  population integer not null check (population > 0),
  source text not null check (length(trim(source)) > 0),
  source_url text not null check (source_url ~ '^https://'),
  reference_date date not null,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (city, state, reference_date)
);

create table if not exists public.impact_easter_eggs (
  key text primary key,
  category text not null check (category in ('education','health','mental_health','social','pets','environment')),
  trigger_relation_key text references public.impact_scale_relations(key),
  content text not null,
  editorial_approved boolean not null default false,
  legal_approved boolean not null default false,
  enabled boolean not null default false,
  probability_basis_points integer not null default 0 check (probability_basis_points between 0 and 1000),
  excluded_contexts text[] not null default array['checkout','wallet']::text[],
  created_at timestamptz not null default now(),
  check (not enabled or (editorial_approved and legal_approved))
);

insert into public.impact_units (key, category, singular, plural, unit_type) values
('school_kit','education','kit escolar','kits escolares','discrete'),
('student','education','aluno','alunos','discrete'),
('book','education','livro','livros','discrete'),
('tutoring_hour','education','hora de reforço','horas de reforço','continuous'),
('class','education','aula','aulas','discrete'),
('computer','education','computador','computadores','discrete'),
('uniform','education','uniforme','uniformes','discrete'),
('scholarship','education','bolsa','bolsas','discrete'),
('course_completed','education','curso concluído','cursos concluídos','discrete'),
('consultation','health','consulta','consultas','discrete'),
('exam','health','exame','exames','discrete'),
('treatment_month','health','mês de tratamento','meses de tratamento','continuous'),
('medication_dose','health','dose de medicamento','doses de medicamento','discrete'),
('hospital_night','health','noite hospitalar','noites hospitalares','discrete'),
('medical_transport','health','transporte médico','transportes médicos','discrete'),
('medical_equipment','health','equipamento médico','equipamentos médicos','discrete'),
('person_attended','health','pessoa atendida','pessoas atendidas','discrete'),
('care_hour','health','hora de cuidado','horas de cuidado','continuous'),
('session','mental_health','sessão','sessões','discrete'),
('listening_hour','mental_health','hora de escuta','horas de escuta','continuous'),
('conversation_circle','mental_health','roda de conversa','rodas de conversa','discrete'),
('participant','mental_health','participante','participantes','discrete'),
('support_group','mental_health','grupo de apoio','grupos de apoio','discrete'),
('workshop','mental_health','oficina','oficinas','discrete'),
('person_followed','mental_health','pessoa acompanhada','pessoas acompanhadas','discrete'),
('online_session','mental_health','atendimento online','atendimentos online','discrete'),
('follow_up_month','mental_health','mês de acompanhamento','meses de acompanhamento','continuous'),
('meal','social','refeição','refeições','discrete'),
('food_basket','social','cesta de alimentos','cestas de alimentos','discrete'),
('hygiene_kit','social','kit de higiene','kits de higiene','discrete'),
('clothing_item','social','peça de roupa','peças de roupa','discrete'),
('clothing_set','social','conjunto de roupas','conjuntos de roupas','discrete'),
('blanket','social','cobertor','cobertores','discrete'),
('shelter_night','social','noite de acolhimento','noites de acolhimento','discrete'),
('family_supported','social','família apoiada','famílias apoiadas','discrete'),
('document_issued','social','documento emitido','documentos emitidos','discrete'),
('training','social','capacitação','capacitações','discrete'),
('animal_meal','pets','refeição animal','refeições animais','discrete'),
('food_kg','pets','quilo de ração','quilos de ração','continuous'),
('animal_fed','pets','animal alimentado','animais alimentados','discrete'),
('vet_consultation','pets','consulta veterinária','consultas veterinárias','discrete'),
('vaccine','pets','vacina','vacinas','discrete'),
('neutering','pets','castração','castrações','discrete'),
('rescue','pets','resgate','resgates','discrete'),
('pet_shelter_night','pets','noite de abrigo','noites de abrigo','discrete'),
('animal_bed','pets','cama para animal','camas para animais','discrete'),
('adoption','pets','adoção','adoções','discrete'),
('tree','environment','árvore','árvores','discrete'),
('seedling','environment','muda','mudas','discrete'),
('hectare_restored','environment','hectare restaurado','hectares restaurados','continuous'),
('waste_kg','environment','quilo de resíduo','quilos de resíduos','continuous'),
('waste_ton','environment','tonelada de resíduo','toneladas de resíduos','continuous'),
('bottle_removed','environment','garrafa removida','garrafas removidas','discrete'),
('water_liter','environment','litro de água','litros de água','continuous'),
('river_meter_cleaned','environment','metro de rio ou praia limpo','metros de rio ou praia limpos','continuous'),
('environment_participant','environment','participante','participantes','discrete')
on conflict (key) do update set
  category = excluded.category, singular = excluded.singular, plural = excluded.plural,
  unit_type = excluded.unit_type;

insert into public.impact_scale_relations
(key, category, impact_unit_key, template, reference_key, is_estimate, editorial_status, active, priority)
values
('education-01','education','school_kit','{N} mochilas começando o ano um pouco mais completas.',null,false,'approved',true,1),
('education-02','education','student','uma turma inteira pronta para começar.','CLASS_SIZE',true,'draft',false,2),
('education-03','education','book','uma estante que virou biblioteca.','BOOKS_PER_SHELF',true,'draft',false,3),
('education-04','education','book','livros suficientes para começar cerca de {N} pequenas bibliotecas.','BOOKS_PER_SMALL_LIBRARY',true,'draft',false,4),
('education-05','education','student','cerca de {N} turmas aprendendo juntas.','CLASS_SIZE',true,'draft',false,5),
('education-06','education','student','estudantes suficientes para ocupar cerca de {N} ônibus escolares.','SCHOOL_BUS_CAPACITY',true,'draft',false,6),
('education-07','education','student','uma escola inteira alcançada.','SCHOOL_SIZE',true,'draft',false,7),
('education-08','education','tutoring_hour','uma aula acontecendo todos os dias durante cerca de {N} meses.','DAYS_PER_MONTH',true,'draft',false,8),
('education-09','education','class','o equivalente a cerca de {N} semestres de encontros.','CLASSES_PER_SEMESTER',true,'draft',false,9),
('education-10','education','computer','cerca de {N} laboratórios ganhando vida.','COMPUTERS_PER_LAB',true,'draft',false,10),
('education-11','education','uniform','roupa para uma turma inteira chegar ao próximo dia de aula.','CLASS_SIZE',true,'draft',false,11),
('education-12','education','scholarship','{N} trajetórias que podem continuar estudando.',null,false,'approved',true,12),
('education-13','education','course_completed','uma sala inteira chegando ao último dia de aula.','CLASS_SIZE',true,'draft',false,13),
('education-14','education','student','como colocar um estudante em cada cadeira de cerca de {N} escolas.','SCHOOL_SIZE',true,'draft',false,14),
('education-15','education','student','o equivalente a uma cidade inteira voltando para a sala de aula.','CITY_POPULATION',true,'draft',false,15),
('health-01','health','consultation','{N} encontros entre alguém que precisava de cuidado e alguém preparado para oferecer.',null,false,'approved',true,1),
('health-02','health','consultation','um atendimento por dia durante um ano inteiro.','DAYS_PER_YEAR',false,'draft',false,2),
('health-03','health','consultation','uma sala de espera inteira recebendo atendimento.','WAITING_ROOM_CAPACITY',true,'draft',false,3),
('health-04','health','consultation','atendimentos suficientes para manter uma clínica atendendo durante cerca de {N} dias.','CLINIC_DAILY_CAPACITY',true,'draft',false,4),
('health-05','health','exam','{N} respostas que puderam começar a ser procuradas.',null,false,'approved',true,5),
('health-06','health','treatment_month','um mês de tratamento para {N} pessoas.','MONTH',true,'draft',false,6),
('health-07','health','medication_dose','tratamento suficiente para acompanhar {N} pessoas durante cerca de {N} dias.','DAILY_MEDICATION_DOSES',true,'draft',false,7),
('health-08','health','hospital_night','uma cama ocupada todas as noites durante cerca de {N} meses.','DAYS_PER_MONTH',true,'draft',false,8),
('health-09','health','hospital_night','duas camas disponíveis todas as noites durante um ano.','TWO_BEDS_YEAR',false,'draft',false,9),
('health-10','health','medical_transport','{N} caminhos entre casa e o cuidado.',null,false,'approved',true,10),
('health-11','health','medical_equipment','equipamentos suficientes para preparar cerca de {N} consultórios.','EQUIPMENT_PER_OFFICE',true,'draft',false,11),
('health-12','health','person_attended','pessoas suficientes para ocupar cerca de {N} ônibus.','BUS_CAPACITY',true,'draft',false,12),
('health-13','health','person_attended','um pequeno estádio inteiro chegando ao cuidado.','SMALL_STADIUM_CAPACITY',true,'draft',false,13),
('health-14','health','person_attended','um atendimento para cada morador de uma cidade desse tamanho.','CITY_POPULATION',true,'draft',false,14),
('health-15','health','care_hour','cuidado acontecendo continuamente durante cerca de {N} dias.','HOURS_PER_DAY',true,'draft',false,15),
('mental-01','mental_health','session','{N} espaços reservados para alguém ser ouvido.',null,false,'approved',true,1),
('mental-02','mental_health','session','uma conversa por dia durante um ano inteiro.','DAYS_PER_YEAR',false,'draft',false,2),
('mental-03','mental_health','listening_hour','{N} horas em que alguém teve espaço para ser ouvido.',null,false,'approved',true,3),
('mental-04','mental_health','conversation_circle','uma roda acontecendo toda semana durante cerca de {N} meses.','WEEKS_PER_MONTH',true,'draft',false,4),
('mental-05','mental_health','participant','uma sala inteira encontrando espaço para conversar.','ROOM_CAPACITY',true,'draft',false,5),
('mental-06','mental_health','participant','pessoas suficientes para ocupar um cinema inteiro.','CINEMA_CAPACITY',true,'draft',false,6),
('mental-07','mental_health','support_group','{N} círculos onde conversar deixou de ser algo solitário.',null,false,'approved',true,7),
('mental-08','mental_health','session','um ano de encontros semanais para cerca de {N} pessoas.','WEEKS_PER_YEAR',true,'draft',false,8),
('mental-09','mental_health','listening_hour','um consultório funcionando durante cerca de {N} dias inteiros.','OFFICE_HOURS_DAY',true,'draft',false,9),
('mental-10','mental_health','workshop','uma oficina acontecendo toda semana durante cerca de {N} meses.','WEEKS_PER_MONTH',true,'draft',false,10),
('mental-11','mental_health','person_followed','uma escola inteira de pessoas tendo acesso a apoio.','SCHOOL_SIZE',true,'draft',false,11),
('mental-12','mental_health','online_session','{N} vezes em que a distância não impediu uma conversa.',null,false,'approved',true,12),
('mental-13','mental_health','follow_up_month','o equivalente a cerca de {N} anos de acompanhamento somados.','MONTHS_PER_YEAR',true,'draft',false,13),
('mental-14','mental_health','participant','um momento de escuta para cada pessoa em cerca de {N} ônibus lotados.','BUS_CAPACITY',true,'draft',false,14),
('mental-15','mental_health','participant','o equivalente a uma cidade inteira encontrando espaço para conversar.','CITY_POPULATION',true,'draft',false,15),
('social-01','social','meal','{N} lugares à mesa.',null,false,'approved',true,1),
('social-02','social','meal','uma família sentando para comer durante cerca de {N} dias.','FAMILY_MEALS_DAY',true,'draft',false,2),
('social-03','social','meal','uma escola inteira almoçando durante cerca de {N} dias.','SCHOOL_SIZE',true,'draft',false,3),
('social-04','social','meal','o equivalente a ocupar todas as cadeiras de cerca de {N} restaurantes.','RESTAURANT_CAPACITY',true,'draft',false,4),
('social-05','social','meal','uma cidade inteira sentando à mesa.','CITY_POPULATION',true,'draft',false,5),
('social-06','social','food_basket','{N} despensas começando o mês mais cheias.',null,false,'approved',true,6),
('social-07','social','hygiene_kit','um kit em cada assento de cerca de {N} ônibus lotados.','BUS_CAPACITY',true,'draft',false,7),
('social-08','social','clothing_item','roupa suficiente para vestir uma escola inteira.','SCHOOL_SIZE',true,'draft',false,8),
('social-09','social','clothing_set','uma troca de roupa para cada pessoa em cerca de {N} ônibus.','BUS_CAPACITY',true,'draft',false,9),
('social-10','social','blanket','{N} noites começando um pouco mais quentes.',null,false,'approved',true,10),
('social-11','social','shelter_night','uma cama disponível todas as noites durante cerca de {N} anos.','DAYS_PER_YEAR',true,'draft',false,11),
('social-12','social','family_supported','famílias suficientes para preencher cerca de {N} prédios residenciais.','FAMILIES_PER_BUILDING',true,'draft',false,12),
('social-13','social','document_issued','{N} pessoas com um documento a mais abrindo caminhos.',null,false,'approved',true,13),
('social-14','social','training','uma sala inteira chegando ao fim de um curso.','CLASS_SIZE',true,'draft',false,14),
('social-15','social','meal','o suficiente para alcançar uma cidade inteira durante um dia.','CITY_POPULATION',true,'draft',false,15),
('pets-01','pets','animal_meal','{N} potes de comida cheios.',null,false,'approved',true,1),
('pets-02','pets','food_kg','comida para cerca de {N} animais durante {N} dias.','ANIMAL_FOOD_DAY_KG',true,'draft',false,2),
('pets-03','pets','food_kg','ração suficiente para encher cerca de {N} carrinhos de supermercado.','SHOPPING_CART_KG',true,'draft',false,3),
('pets-04','pets','animal_fed','um abrigo inteiro com o pote cheio.','ANIMALS_PER_SHELTER',true,'draft',false,4),
('pets-05','pets','vet_consultation','{N} encontros com cuidado veterinário.',null,false,'approved',true,5),
('pets-06','pets','vet_consultation','um animal chegando ao veterinário todos os dias durante um ano.','DAYS_PER_YEAR',false,'draft',false,6),
('pets-07','pets','vaccine','proteção para os animais de cerca de {N} abrigos desse tamanho.','ANIMALS_PER_SHELTER',true,'draft',false,7),
('pets-08','pets','neutering','uma agenda cirúrgica inteira durante cerca de {N} dias.','SURGERIES_PER_DAY',true,'draft',false,8),
('pets-09','pets','rescue','{N} trajetos da rua até um lugar de cuidado.',null,false,'approved',true,9),
('pets-10','pets','pet_shelter_night','uma baia ocupada todas as noites durante cerca de {N} anos.','DAYS_PER_YEAR',true,'draft',false,10),
('pets-11','pets','animal_bed','uma cama para cada animal de um abrigo inteiro.','ANIMALS_PER_SHELTER',true,'draft',false,11),
('pets-12','pets','adoption','{N} primeiras noites em uma nova casa.',null,false,'approved',true,12),
('pets-13','pets','animal_fed','animais suficientes para ocupar cerca de {N} ônibus — se ônibus fossem feitos para patas.','BUS_CAPACITY',true,'draft',false,13),
('pets-14','pets','food_kg','o peso de cerca de {N} carros em comida para animais.','CAR_WEIGHT_KG',true,'draft',false,14),
('pets-15','pets','animal_fed','cuidado suficiente para alcançar dezenas de abrigos ao mesmo tempo.','ANIMALS_PER_SHELTER',true,'draft',false,15),
('environment-01','environment','tree','{N} novas sombras começando a crescer.',null,false,'approved',true,1),
('environment-02','environment','tree','árvores suficientes para formar uma pequena floresta.','SMALL_FOREST_TREES',true,'draft',false,2),
('environment-03','environment','tree','uma árvore em cada lado de cerca de {N} ruas.','TREES_PER_STREET',true,'draft',false,3),
('environment-04','environment','tree','se colocadas em linha, percorreriam cerca de {N} quilômetros.','TREE_SPACING_M',true,'draft',false,4),
('environment-05','environment','seedling','mudas suficientes para ocupar cerca de {N} campos de futebol.','FOOTBALL_FIELD_AREA',true,'draft',false,5),
('environment-06','environment','hectare_restored','uma área equivalente a cerca de {N} campos de futebol voltando a ganhar verde.','FOOTBALL_FIELD_AREA',true,'draft',false,6),
('environment-07','environment','waste_kg','o peso de cerca de {N} carros retirado do ambiente.','CAR_WEIGHT_KG',true,'draft',false,7),
('environment-08','environment','waste_ton','cerca de {N} caminhões de resíduos que não ficaram na natureza.','TRUCK_CAPACITY_TON',true,'draft',false,8),
('environment-09','environment','bottle_removed','se colocadas lado a lado, formariam uma linha de cerca de {N} quilômetros.','BOTTLE_WIDTH_M',true,'draft',false,9),
('environment-10','environment','water_liter','água suficiente para encher cerca de {N} caixas-d''água.','WATER_TANK_LITER',true,'draft',false,10),
('environment-11','environment','water_liter','água equivalente ao consumo de cerca de {N} famílias durante {N} dias.','FAMILY_WATER_DAY_LITER',true,'draft',false,11),
('environment-12','environment','river_meter_cleaned','uma caminhada de cerca de {N} quilômetros por um lugar mais limpo.','METERS_PER_KM',false,'draft',false,12),
('environment-13','environment','environment_participant','uma escola inteira colocando a mão na terra.','SCHOOL_SIZE',true,'draft',false,13),
('environment-14','environment','hectare_restored','o equivalente a cerca de {N} parques recuperados.','PARK_AREA_HECTARE',true,'draft',false,14),
('environment-15','environment','hectare_restored','uma área do tamanho de um bairro inteiro voltando a ganhar verde.','NEIGHBORHOOD_AREA_HECTARE',true,'draft',false,15)
on conflict (key) do update set
  template = excluded.template, reference_key = excluded.reference_key,
  is_estimate = excluded.is_estimate, priority = excluded.priority;

create or replace function private.enforce_impact_rate_review()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare active_count integer;
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
  end if;
  new.updated_at := now();

  if (select auth.role()) <> 'service_role' then
    new.is_verified := false;
    new.verified_at := null;
    new.verified_by := null;
  end if;

  if new.is_active then
    select count(*) into active_count
    from public.organization_impact_rates rate
    where rate.organization_id = new.organization_id
      and rate.is_active
      and rate.id <> new.id;
    if active_count >= 3 then
      raise exception 'impact rate limit reached' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_impact_rate_review on public.organization_impact_rates;
create trigger enforce_impact_rate_review
before insert or update on public.organization_impact_rates
for each row execute function private.enforce_impact_rate_review();

alter table public.impact_units enable row level security;
alter table public.organization_impact_rates enable row level security;
alter table public.impact_reference_constants enable row level security;
alter table public.impact_scale_relations enable row level security;
alter table public.impact_city_references enable row level security;
alter table public.impact_easter_eggs enable row level security;

create policy impact_units_public_read on public.impact_units for select to anon, authenticated using (active);
create policy impact_rates_read on public.organization_impact_rates for select to anon, authenticated using (
  (is_active and is_verified) or private.has_organization_role(organization_id)
);
create policy impact_rates_member_insert on public.organization_impact_rates for insert to authenticated with check (
  private.has_organization_role(organization_id, array['owner','admin','editor'])
);
create policy impact_rates_member_update on public.organization_impact_rates for update to authenticated using (
  private.has_organization_role(organization_id, array['owner','admin','editor'])
) with check (private.has_organization_role(organization_id, array['owner','admin','editor']));
create policy impact_rates_member_delete on public.organization_impact_rates for delete to authenticated using (
  private.has_organization_role(organization_id, array['owner','admin'])
);
create policy impact_references_public_read on public.impact_reference_constants for select to anon, authenticated using (active and length(source_url) > 0);
create policy impact_relations_public_read on public.impact_scale_relations for select to anon, authenticated using (active and editorial_status = 'approved');
create policy impact_cities_public_read on public.impact_city_references for select to anon, authenticated using (active and length(source_url) > 0);
create policy impact_easter_eggs_public_read on public.impact_easter_eggs for select to anon, authenticated using (
  enabled and editorial_approved and legal_approved
);

grant select on public.impact_units, public.organization_impact_rates, public.impact_reference_constants,
  public.impact_scale_relations, public.impact_city_references, public.impact_easter_eggs to anon, authenticated;
grant insert, update on public.organization_impact_rates to authenticated;
grant delete on public.organization_impact_rates to authenticated;

comment on table public.organization_impact_rates is 'Organization-specific, sourced money-to-impact rates. Public only after TranquiliCare verification.';
comment on table public.impact_scale_relations is 'Editorial catalog. Source-dependent relations remain inactive until their reference is sourced.';
comment on table public.impact_easter_eggs is 'Rare optional content; disabled unless both editorial and legal approval are recorded.';