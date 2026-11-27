# Zakupy z zaklęciami i opcjonalnym przyspieszeniem

Status: specyfikacja do wdrożenia w Beta. Ten dokument nie oznacza, że funkcja jest już aktywna.

## Wymagany przepływ gracza

1. Gracz wybiera pakiet i widzi swoje aktywne zaklęcia wpływające na cenę.
2. Serwer wylicza cenę bazową, rabaty, ewentualne ograniczenie maksymalnego rabatu z `tm_store_settings` oraz cenę końcową. Klient nie przesyła zaufanej ceny.
3. Przed wysłaniem zamówienia gracz widzi podsumowanie: pakiet, zaklęcia i poziomy, cenę bazową, zastosowane rabaty i cenę końcową.
4. Formularz ma opcjonalną sekcję z dokładnym tekstem „Jeśli chcesz szybciej”. Gracz może dodać nagranie potwierdzające płatność albo pominąć je bez blokowania standardowego zamówienia.
5. Po utworzeniu zamówienia gracz otrzymuje identyfikator zamówienia i wygenerowaną komendę płatności z ceną obliczoną po stronie serwera. Komenda jest związana z konkretnym zamówieniem i nie może być ponownie wykorzystana do innego zamówienia.

## Panel administratora

- Nowa zakładka „Zakupy” pokazuje oczekujące zamówienia, również te z zaklęciami.
- Lista i szczegóły zamówienia pokazują: gracza, nick Minecraft, pakiet, zaklęcia wraz z poziomami, cenę bazową, rabaty, cenę końcową, status, datę, informację o prośbie o przyspieszenie oraz bezpieczny podgląd/odtwarzanie załączonego nagrania.
- Administrator może zatwierdzić lub odrzucić zamówienie. Decyzja musi być audytowana i powiązana z administratorem.
- Komenda widoczna administratorowi musi być identyczna z komendą przekazaną kupującemu. Cena komendy pochodzi z niezmiennego snapshotu zamówienia, a nie z aktualnego cennika po czasie.
- Brak nagrania nie może oznaczać odrzucenia ani błędu zamówienia. Nagranie jest materiałem pomocniczym do ręcznej weryfikacji, nie automatycznym dowodem zapłaty.

## Dane i bezpieczeństwo

Docelowe rozszerzenie `public.orders` (nazwy pól mogą zostać dopasowane do istniejącego schematu po przygotowaniu migracji):
- `base_price_m numeric` — cena bazowa zapisana w momencie zamówienia;
- `enchant_snapshot jsonb` — lista zaklęć i poziomów użytych do kalkulacji;
- `discount_snapshot jsonb` — rozpisane zastosowane rabaty;
- `final_price_m numeric` — niezmienna cena końcowa;
- `payment_command text` lub bezpieczniejszy identyfikator/parametry do generowania komendy;
- `expedite_requested boolean not null default false`;
- `payment_proof_path text null` — ścieżka w prywatnym bucketcie, nigdy publiczny URL;
- `expedite_status text` — np. `not_requested`, `requested`, `reviewed`;
- pola audytowe decyzji administratora, jeżeli nie istnieje już odpowiedni dziennik.

Wymagania:
- Cena i snapshot zaklęć są wyliczane oraz zapisywane atomowo po stronie serwera (RPC/serwerowa funkcja); klient nie może ustawić `price_m`, `final_price_m`, statusu zatwierdzenia ani komendy.
- Wykorzystać istniejące `orders`, `tm_store_settings` i istniejący system ról. Nie tworzyć drugiego równoległego rejestru zakupów.
- Pliki przechowywać w prywatnym Supabase Storage bucket. Limity rozmiaru i dozwolone formaty należy skonfigurować przed wdrożeniem. Dostęp do pliku wyłącznie dla właściciela zamówienia i uprawnionego personelu, najlepiej przez krótkotrwałe signed URL generowane po sprawdzeniu roli.
- Nie udostępniać plików nagrań przez publiczny bucket ani bezpośredni, trwały URL.
- Sprawdzanie uprawnień personelu musi odbywać się w bazie/serwerze na podstawie `user_roles`, nie na podstawie metadanych edytowalnych przez użytkownika.
- Każde zatwierdzenie/odrzucenie jest idempotentne i audytowane; ponowne kliknięcie nie może nadać pakietu drugi raz.
- RLS ma blokować bezpośrednie ustawianie przez użytkownika pól ceny, komendy i statusu oraz odczyt cudzych zamówień i nagrań.
- Wykonać migrację wyłącznie w bazie Beta `owzyzfltwronhxbsrccd`. Nie modyfikować produkcyjnej bazy `ogroffplttjcdfmrsrpe`.

## Testy akceptacyjne

1. Zamówienie bez zaklęć tworzy się i zachowuje dotychczasowe działanie.
2. Zamówienie z rabatem wylicza poprawną cenę i pokazuje adminowi dokładny snapshot zaklęć.
3. Zmiana cennika po utworzeniu zamówienia nie zmienia jego zapisanej ceny ani komendy.
4. Użytkownik nie może podmienić ceny, rabatu, komendy, statusu ani ścieżki nagrania przez DevTools/API.
5. Zakup z prośbą o przyspieszenie bez nagrania działa normalnie.
6. Zakup z nagraniem zapisuje plik prywatnie; inny użytkownik nie może go odczytać.
7. Admin widzi nagranie tylko po autoryzacji i może ręcznie oznaczyć je jako sprawdzone.
8. Zatwierdzenie zamówienia przyznaje uprawnienie dokładnie raz; odrzucenie nie przyznaje pakietu.
9. Zwykły użytkownik nie może odczytać listy zakupów ani nagrań innych osób.
10. Wszystkie testy wykonane na Beta; brak zmian w produkcji.

## Kroki wdrożenia

1. Najpierw przygotować i przejrzeć migrację dla Beta, po uzgodnieniu dokładnych istniejących kolumn, polityk RLS, funkcji i bucketów.
2. Dodać serwerowy RPC do tworzenia zamówienia i kalkulacji ceny oraz RPC do decyzji administratora.
3. Dodać prywatny bucket i polityki dostępu dla dowodów płatności.
4. Zmienić formularz zakupu, by używał nowego RPC, wysyłał plik tylko jeśli został dodany i pokazywał wygenerowaną komendę.
5. Rozszerzyć panel administratora o listę i szczegóły zamówień, snapshot zaklęć, komendę oraz podgląd nagrania.
6. Uruchomić testy RLS, RPC, cen, uprawnień i idempotencji na Beta.
7. Wykonać preview deployment z gałęzi `feature/trapmasters-update-1.0` i dopiero po weryfikacji udostępnić link Beta.
