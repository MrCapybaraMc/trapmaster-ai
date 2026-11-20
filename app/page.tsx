
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

type Package = {
  id: "day" | "week" | "month" | "forever";
  name: string;
  price: number;
  duration: string;
  description: string;
  popular?: boolean;
};

type UserRole = "user" | "admin" | "owner";
type Language = "pl" | "en";
type Tab =
  | "forum"
  | "updates"
  | "announcements"
  | "trappers"
  | "help"
  | "recruitment"
  | "creators"
  | "daily"
  | "support-admin"
  | "recruitment-admin";

type UserProfile = { nickname: string; avatar_url: string | null; points: number; daily_streak: number; last_daily_claim: string | null; };

type ForumPost = {
  id: string;
  user_id: string;
  author_name: string;
  author_avatar_url?: string | null;
  content: string;
  created_at: string;
};

type SiteAnnouncement = { id: string; title: string; content: string; created_by: string; created_at: string; };

type Trapmaster = {
  display_name: string;
  access_type: string;
  expires_at: string | null;
};

type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  category?: string;
  priority?: string;
  related_order?: string | null;
  page_url?: string | null;
  status: string;
  created_at: string;
};

type RecruitmentApplication = {
  id: string;
  user_id: string;
  minecraft_nick: string;
  experience: string;
  motivation: string;
  likes_zenciaka?: boolean;
  applicant_age?: number | null;
  first_name?: string | null;
  about?: string | null;
  status: string;
  created_at: string;
};

const MUSIC_KEY = "trapmasters_music_enabled";
const LANGUAGE_KEY = "trapmasters-language";

const packages: Package[] = [
  {
    id: "day",
    name: "TESTER",
    price: 2,
    duration: "1 dzień dostępu",
    description: "Przetestuj możliwości TrapMastera",
  },
  {
    id: "week",
    name: "POCZĄTKUJĄCY TRAPER",
    price: 5,
    duration: "7 dni dostępu",
    description: "Idealny na początek",
  },
  {
    id: "month",
    name: "TRAPER",
    price: 12,
    duration: "30 dni dostępu",
    description: "Więcej czasu na zabawę",
    popular: true,
  },
  {
    id: "forever",
    name: "TRAPMASTER",
    price: 28,
    duration: "Bez limitu czasowego",
    description: "Jednorazowy zakup",
  },
];

const packageTranslations = {
  pl: {
    day: {
      name: "TESTER",
      description: "Przetestuj możliwości TrapMastera",
      duration: "1 dzień dostępu",
    },
    week: {
      name: "POCZĄTKUJĄCY TRAPER",
      description: "Idealny na początek",
      duration: "7 dni dostępu",
    },
    month: {
      name: "TRAPER",
      description: "Więcej czasu na zabawę",
      duration: "30 dni dostępu",
    },
    forever: {
      name: "TRAPMASTER",
      description: "Jednorazowy zakup",
      duration: "Bez limitu czasowego",
    },
  },
  en: {
    day: {
      name: "TESTER",
      description: "Try out TrapMaster's features",
      duration: "1 day of access",
    },
    week: {
      name: "BEGINNER TRAPPER",
      description: "Perfect for getting started",
      duration: "7 days of access",
    },
    month: {
      name: "TRAPPER",
      description: "More time to enjoy trapping",
      duration: "30 days of access",
    },
    forever: {
      name: "TRAPMASTER",
      description: "One-time purchase",
      duration: "Unlimited access",
    },
  },
};
const translations = {
  pl: {
    offer: "Oferta",
    trapmaster: "TrapMaster",
    info: "Informacje",
    account: "Moje konto",
    trapper: "Otwórz TrapMaster",
    login: "ZALOGUJ / ZAREJESTRUJ",
    heroLabel: "MINECRAFT TRAP LIBRARY",
    heroTitle: "ZOSTAŃ",
    heroTitle2: "TRAP MASTEREM",
    heroDescription:
      "Odkrywaj ciekawe pułapki Minecraft, poznawaj nowe pomysły i korzystaj z biblioteki TRAPMASTERS.",
    seeOffer: "ZOBACZ OFERTĘ",
    myAccount: "MOJE KONTO",
    choosePlan: "WYBIERZ SWÓJ PLAN",
    ourOffer: "NASZA OFERTA",
    offerDescription: "Wybierz pakiet dostępu do TRAPMASTERS.",
    choose: "WYBIERAM TEN PLAN",
    popular: "NAJPOPULARNIEJSZY",
    serverDollars: "dolarów serwerowych",
    paymentTitle: "TWÓJ WYBRANY PLAN",
    minecraftNick: "Nick Minecraft",
    discountCode: "Kod rabatowy (opcjonalnie)",
    priceToPay: "Cena do zapłaty",
    paymentCommand: "Komenda płatności:",
    copy: "KOPIUJ KOMENDĘ",
    copied: "SKOPIOWANO!",
    howToPay: "Jak zrealizować zamówienie?",
    pay1: "Skopiuj komendę płatności.",
    pay2: "Wejdź na BananaSMP i wykonaj komendę.",
    pay3: "Upewnij się, że płatność została wysłana.",
    pay4: "Wróć tutaj i kliknij przycisk wysłania zamówienia.",
    processing: "Czas realizacji zamówienia",
    processingText:
      "Zamówienia są realizowane do 24h w dni robocze i do 36h w dni wolne.",
    sendOrder: "ZAPŁACIŁEM — WYŚLIJ ZAMÓWIENIE",
    sending: "WYSYŁANIE...",
    back: "Wróć do oferty",
    loginRequired: "Aby wysłać zamówienie, musisz się zalogować.",
    stepsTitle: "CZYM JEST",
    stepsIntro:
      "TrapMaster pomaga dobrać odpowiednie trapy do Twojego celu i przedmiotów, które posiadasz. Wypełniasz ankietę, a program przygotowuje propozycje i instrukcje.",
    step1: "Podajesz itemy celu poprzez wypełnienie ankiety.",
    step2: "Wysyłasz odpowiedzi.",
    step3:
      "Program sam dobiera do tych itemów najlepsze trapy, które przedstawia w instrukcjach i schematicu.",
    step4: "Pobierasz schematic i trapujesz go!",
    stepsButton: "OTWÓRZ TRAPMASTER",
    stepsBottom: "TY PODAJESZ ITEMY. TRAPMASTER DOBIERA TRAPY.",
    infoTitle: "WAŻNA INFORMACJA",
    infoText:
      "TRAPMASTERS jest niezależnym projektem społecznościowym. Nie jest oficjalną stroną BananaSMP.pl i nie jest przez ten serwer prowadzony ani wspierany.",
    adminsTitle: "KONTA ADMINISTRATORÓW",
    adminsText:
      "Wybranym kontom użytkowników możemy przyznać uprawnienia administratora. Administratorzy pomagają w zarządzaniu stroną i zgłoszeniami.",
    help: "Pomoc",
    forum: "Forum",
    trappers: "TrapMasterzy",
    recruitment: "Rekrutacja",
    creators: "Trap Creators",
    daily: "Daily",
    settings: "Ustawienia",
    supportAdmin: "Zgłoszenia",
    recruitmentAdmin: "Zgłoszenia rekrutacyjne",
    send: "WYŚLIJ",
    loading: "Ładowanie...",
    noPosts: "Nie ma jeszcze żadnych postów. Napisz pierwszy!",
    forumPlaceholder: "Napisz coś do społeczności...",
    forumTitle: "FORUM SPOŁECZNOŚCI",
    forumDescription:
      "Rozmawiaj z innymi graczami, dziel się pomysłami i poznawaj społeczność TRAPMASTERS.",
    helpTitle: "POTRZEBUJESZ POMOCY?",
    helpDescription:
      "Masz problem z zakupem, dostępem lub kontem? Napisz do administracji bezpośrednio przez formularz.",
    subject: "Temat zgłoszenia",
    message: "Wiadomość",
    messagePlaceholder: "Opisz swój problem...",
    recruitmentTitle: "DOŁĄCZ DO ADMINISTRACJI",
    recruitmentDescription:
      "Chcesz pomagać w rozwijaniu TRAPMASTERS? Wyślij zgłoszenie rekrutacyjne.",
    experience: "Twoje doświadczenie",
    experiencePlaceholder: "Opisz swoje doświadczenie...",
    motivation: "Dlaczego chcesz dołączyć?",
    motivationPlaceholder: "Napisz, dlaczego chcesz dołączyć...",
    nick: "Twój nick Minecraft",
    sendApplication: "WYŚLIJ ZGŁOSZENIE",
    creatorsTitle: "TRAP CREATORS",
    creatorsFuture: "Wkrótce",
    founder: "Założyciel strony",
    settingsTitle: "USTAWIENIA STRONY",
    language: "Język strony",
    sound: "Dźwięk strony",
    soundOn: "WŁĄCZONY",
    soundOff: "WYŁĄCZONY",
    trappersTitle: "AKTYWNI TRAPMASTERZY",
    noTrappers: "Nie znaleziono jeszcze aktywnych TrapMasterów.",
    adminPanel: "PANEL ZGŁOSZEŃ",
    sender: "Nadawca",
    status: "Status",
    date: "Data",
    actions: "Akcje",
    noTickets: "Brak zgłoszeń.",
    noApplications: "Brak zgłoszeń rekrutacyjnych.",
    open: "Otwarte",
    progress: "W trakcie",
    closed: "Zamknięte",
    pending: "Oczekujące",
    accepted: "Zaakceptowane",
    rejected: "Odrzucone",
    paused: "Strona tymczasowo nieczynna",
    pausedText: "Aktualnie nie przyjmujemy nowych zamówień. Zapraszamy ponownie później!",
    discord: "DOŁĄCZ NA DISCORDA",
    footer: "Wszelkie prawa zastrzeżone.",
    success: "Wysłano pomyślnie!",
    loginFirst: "Najpierw zaloguj się na swoje konto.",
    nickRequired: "Wpisz swój nick Minecraft.",
    fillFields: "Uzupełnij wszystkie wymagane pola.",
    forumError: "Nie udało się wysłać postu.",
    ticketError: "Nie udało się wysłać zgłoszenia.",
    applicationError: "Nie udało się wysłać rekrutacji.",
    orderError: "Nie udało się utworzyć zamówienia.",
    accessType: "Rodzaj dostępu",
    expires: "Wygasa",
    permanent: "Bezterminowy",
    discountApplied: "Rabat został naliczony.",
    discount: "Rabat",
    loadingAccess: "Sprawdzanie dostępności strony...",
    noPermission: "Brak uprawnień.",
    statusUpdated: "Status został zmieniony.",
  },
  en: {
    offer: "Offer",
    trapmaster: "TrapMaster",
    info: "Information",
    account: "My account",
    trapper: "Open TrapMaster",
    login: "LOGIN / REGISTER",
    heroLabel: "MINECRAFT TRAP LIBRARY",
    heroTitle: "BECOME A",
    heroTitle2: "TRAP MASTER",
    heroDescription:
      "Discover Minecraft traps, explore new ideas and use the TRAPMASTERS library.",
    seeOffer: "VIEW OFFER",
    myAccount: "MY ACCOUNT",
    choosePlan: "CHOOSE YOUR PLAN",
    ourOffer: "OUR OFFER",
    offerDescription: "Choose your TRAPMASTERS access package.",
    choose: "CHOOSE THIS PLAN",
    popular: "MOST POPULAR",
    serverDollars: "server dollars",
    paymentTitle: "YOUR SELECTED PLAN",
    minecraftNick: "Minecraft nickname",
    discountCode: "Discount code (optional)",
    priceToPay: "Total price",
    paymentCommand: "Payment command:",
    copy: "COPY COMMAND",
    copied: "COPIED!",
    howToPay: "Jak zrealizować zamówienie?",
    pay1: "Copy the payment command.",
    pay2: "Join BananaSMP and execute the command.",
    pay3: "Make sure the payment was sent.",
    pay4: "Return here and submit your order.",
    processing: "Order processing time",
    processingText:
      "Orders are processed within 24 hours on weekdays and 36 hours on days off.",
    sendOrder: "I PAID — SUBMIT ORDER",
    sending: "SENDING...",
    back: "Back to offer",
    loginRequired: "You must log in to submit an order.",
    stepsTitle: "WHAT IS",
    stepsIntro:
      "TrapMaster helps choose traps for your goal and available items. Complete a questionnaire and the program prepares suggestions and instructions.",
    step1: "Enter your target's items by completing the questionnaire.",
    step2: "Submit your answers.",
    step3:
      "The program selects the best traps for those items and presents them in instructions and a schematic.",
    step4: "Download the schematic and build your trap!",
    stepsButton: "OPEN TRAPMASTER",
    stepsBottom: "YOU PROVIDE THE ITEMS. TRAPMASTER SELECTS THE TRAPS.",
    infoTitle: "IMPORTANT INFORMATION",
    infoText:
      "TRAPMASTERS is an independent community project. It is not an official BananaSMP.pl website and is not operated or endorsed by that server.",
    adminsTitle: "ADMINISTRATOR ACCOUNTS",
    adminsText:
      "Selected user accounts may receive administrator permissions. Administrators help manage the website and submissions.",
    help: "Help",
    forum: "Forum",
    trappers: "TrapMasters",
    recruitment: "Recruitment",
    creators: "Trap Creators",
    daily: "Daily rewards",
    settings: "Settings",
    supportAdmin: "Support submissions",
    recruitmentAdmin: "Zgłoszenia rekrutacyjne",
    send: "SEND",
    loading: "Loading...",
    noPosts: "There are no posts yet. Be the first!",
    forumPlaceholder: "Write something to the community...",
    forumTitle: "COMMUNITY FORUM",
    forumDescription:
      "Talk to other players, share ideas and meet the TRAPMASTERS community.",
    helpTitle: "NEED HELP?",
    helpDescription:
      "Having trouble with a purchase, access or your account? Contact the administration using this form.",
    subject: "Ticket subject",
    message: "Message",
    messagePlaceholder: "Describe your problem...",
    recruitmentTitle: "JOIN THE ADMINISTRATION",
    recruitmentDescription:
      "Would you like to help develop TRAPMASTERS? Send a recruitment application.",
    experience: "Your experience",
    experiencePlaceholder: "Describe your experience...",
    motivation: "Why do you want to join?",
    motivationPlaceholder: "Tell us why you want to join...",
    nick: "Your Minecraft nickname",
    sendApplication: "SEND APPLICATION",
    creatorsTitle: "TRAP CREATORS",
    creatorsFuture: "Coming soon",
    founder: "Website founder",
    settingsTitle: "WEBSITE SETTINGS",
    language: "Website language",
    sound: "Website sound",
    soundOn: "ON",
    soundOff: "OFF",
    trappersTitle: "ACTIVE TRAPMASTERS",
    noTrappers: "No active TrapMasters found yet.",
    adminPanel: "SUBMISSIONS PANEL",
    sender: "Sender",
    status: "Status",
    date: "Date",
    actions: "Actions",
    noTickets: "No submissions.",
    noApplications: "No recruitment applications.",
    open: "Open",
    progress: "In progress",
    closed: "Zamknięte",
    pending: "Pending",
    accepted: "Accepted",
    rejected: "Rejected",
    paused: "Website temporarily unavailable",
    pausedText: "We are not accepting new orders right now. Please come back later!",
    discord: "JOIN DISCORD",
    footer: "All rights reserved.",
    success: "Sent successfully!",
    loginFirst: "Please log in first.",
    nickRequired: "Enter your Minecraft nickname.",
    fillFields: "Complete all required fields.",
    forumError: "Could not send the post.",
    ticketError: "Could not send the ticket.",
    applicationError: "Could not send the application.",
    orderError: "Could not create the order.",
    accessType: "Access type",
    expires: "Expires",
    permanent: "No expiry",
    discountApplied: "Discount applied.",
    discount: "Discount",
    loadingAccess: "Checking website availability...",
    noPermission: "You do not have permission.",
    statusUpdated: "Status updated.",
  },
};

function formatPrice(value: number) {
  return Number(value.toFixed(2)).toString() + "m";
}

function formatDate(value: string | null, lang: Language) {
  if (!value) return lang === "pl" ? "Bezterminowy" : "No expiry";

  return new Date(value).toLocaleString(lang === "pl" ? "pl-PL" : "en-US");
}

export default function Home() {
  const pathname = usePathname();
  const router = useRouter();
  // Avoid creating the browser Supabase client during Next.js server prerendering.
  const [supabase] = useState<ReturnType<typeof createClient>>(() => {
    if (typeof window === "undefined") {
      return null as unknown as ReturnType<typeof createClient>;
    }
    return createClient();
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [selected, setSelected] = useState<Package | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dailyMessage, setDailyMessage] = useState("");
  const [dailyBusy, setDailyBusy] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("user");
  const [hasTrapperAccess, setHasTrapperAccess] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [musicEnabled, setMusicEnabled] = useState(false);
  const [language, setLanguage] = useState<Language>("pl");
  const [activeTab, setActiveTab] = useState<Tab>("forum");

  useEffect(() => {
    if (pathname === "/aktualizacje") setActiveTab("updates");
    else if (pathname === "/ogloszenia") setActiveTab("announcements");
  }, [pathname]);

  const [minecraftNick, setMinecraftNick] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);

  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [forumContent, setForumContent] = useState("");
  const [forumLoading, setForumLoading] = useState(false);
  const [forumSending, setForumSending] = useState(false);
  const [forumMessage, setForumMessage] = useState("");
  const [announcements, setAnnouncements] = useState<SiteAnnouncement[]>([]);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementSending, setAnnouncementSending] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState("");

  const [trappers, setTrappers] = useState<Trapmaster[]>([]);
  const [trappersLoading, setTrappersLoading] = useState(false);

  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("other");
  const [ticketPriority, setTicketPriority] = useState("normal");
  const [ticketOrder, setTicketOrder] = useState("");
  const [ticketContent, setTicketContent] = useState("");
  const [ticketSending, setTicketSending] = useState(false);
  const [ticketMessage, setTicketMessage] = useState("");

  const [applicationNick, setApplicationNick] = useState("");
  const [applicationExperience, setApplicationExperience] = useState("");
  const [applicationMotivation, setApplicationMotivation] = useState("");
  const [likesZenciaka, setLikesZenciaka] = useState<boolean | null>(null);
  const [applicantAge, setApplicantAge] = useState("");
  const [applicantFirstName, setApplicantFirstName] = useState("");
  const [applicantAbout, setApplicantAbout] = useState("");
  const [applicationSending, setApplicationSending] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState("");

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [applications, setApplications] = useState<RecruitmentApplication[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");

  const t = translations[language];
  const isAdmin = userRole === "admin" || userRole === "owner";

  const loadProfile = useCallback(async (id: string) => {
    if (!id) { setProfile(null); return; }
    const { data } = await supabase.from("profiles").select("nickname,avatar_url,points,daily_streak,last_daily_claim").eq("user_id", id).maybeSingle();
    setProfile(data as UserProfile | null);
  }, [supabase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let visitId = sessionStorage.getItem("trapmasters_visit_id");
    if (!visitId) {
      visitId = crypto.randomUUID();
      sessionStorage.setItem("trapmasters_visit_id", visitId);
    }
    supabase.rpc("track_site_visit", {
      p_session_id: visitId,
      p_route: window.location.pathname,
    });
  }, [supabase]);

  // Ustawienia jÄ™zyka i dĹşwiÄ™ku.
  useEffect(() => {
    const savedMusic = localStorage.getItem(MUSIC_KEY);
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);

    setMusicEnabled(savedMusic === "true");

    if (savedLanguage === "pl" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    }

    function handleMusicChange(event: Event) {
      const customEvent = event as CustomEvent<boolean>;
      setMusicEnabled(Boolean(customEvent.detail));
    }

    function handleLanguageChange(event: Event) {
      const customEvent = event as CustomEvent<string>;
      setLanguage(customEvent.detail === "en" ? "en" : "pl");
    }

    window.addEventListener("trapmasters-music-change", handleMusicChange);
    window.addEventListener("trapmasters-language-change", handleLanguageChange);

    return () => {
      window.removeEventListener("trapmasters-music-change", handleMusicChange);
      window.removeEventListener("trapmasters-language-change", handleLanguageChange);
    };
  }, []);

  function changeLanguage(next: Language) {
    setLanguage(next);
    localStorage.setItem(LANGUAGE_KEY, next);
  }

  function toggleMusic() {
    const next = !musicEnabled;

    setMusicEnabled(next);
    localStorage.setItem(MUSIC_KEY, String(next));

    window.dispatchEvent(
      new CustomEvent("trapmasters-music-change", { detail: next })
    );

    const video = videoRef.current;

    if (video) {
      video.muted = !next;
      if (next) video.play().catch(() => {});
    }
  }

  // Konto, rola, dostÄ™p TrapMaster i ustawienia zamĂłwieĹ„.
  const loadRole = useCallback(
    async (id: string | undefined) => {
      if (!id) {
        setUserRole("user");
        setHasTrapperAccess(false);
        return;
      }

      const { data, error } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", id)
        .maybeSingle();

      let role: UserRole = "user";

      if (!error && data?.role === "owner") role = "owner";
      else if (!error && data?.role === "admin") role = "admin";

      setUserRole(role);

      if (role === "owner") {
        setHasTrapperAccess(true);
        return;
      }

      // Admins manage the website but do not receive TrapMaster access.
      const { data: access, error: accessError } = await supabase.rpc(
        "has_trapmaster_access"
      );
      setHasTrapperAccess(!accessError && access === true);
    },
    [supabase]
  );

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!mounted) return;

      setLoggedIn(!!user);
      setUserId(user?.id ?? "");
      await loadProfile(user?.id ?? "");
      setAuthLoading(false);

      await loadRole(user?.id);

      if (!mounted) return;

      const { data, error } = await supabase
        .from("site_settings")
        .select("orders_paused")
        .eq("id", true)
        .maybeSingle();

      if (!mounted) return;

      if (error || !data) {
        setPaused(true);
      } else {
        setPaused(!!data.orders_paused);
      }

      setSettingsLoading(false);
    }

    loadData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setLoggedIn(!!session);
      setUserId(session?.user.id ?? "");
      await loadProfile(session?.user.id ?? "");
      await loadRole(session?.user.id);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadRole, loadProfile]);

  // Synchronizacja dĹşwiÄ™ku z filmem.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !musicEnabled;

    if (musicEnabled) video.play().catch(() => {});
  }, [musicEnabled, selected]);

  // Ĺadowanie forum.
  const loadForum = useCallback(async () => {
    setForumLoading(true);

    const { data, error } = await supabase
      .from("forum_posts")
      .select("id,user_id,author_name,author_avatar_url,content,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setForumMessage(error.message);
    } else {
      setForumPosts((data ?? []) as ForumPost[]);
    }

    setForumLoading(false);
  }, [supabase]);

  // Ĺadowanie aktywnych TrapMasterĂłw.
  const loadAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    const { data, error } = await supabase.from("site_announcements")
      .select("id,title,content,created_by,created_at")
      .order("created_at", { ascending: false }).limit(100);
    if (error) setAnnouncementMessage(error.message);
    else setAnnouncements((data ?? []) as SiteAnnouncement[]);
    setAnnouncementsLoading(false);
  }, [supabase]);

  const loadTrappers = useCallback(async () => {
    setTrappersLoading(true);

    const { data, error } = await supabase.rpc("get_trapmasters");

    if (!error) {
      setTrappers((data ?? []) as Trapmaster[]);
    }

    setTrappersLoading(false);
  }, [supabase]);

  // ZgĹ‚oszenia dla administratorĂłw.
  const loadAdminSubmissions = useCallback(async () => {
    if (!isAdmin) return;

    setAdminLoading(true);

    const [ticketResult, applicationResult] = await Promise.all([
      supabase
        .from("support_tickets")
        .select("id,user_id,subject,message,category,priority,related_order,page_url,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100),

      supabase
        .from("recruitment_applications")
        .select("id,user_id,minecraft_nick,experience,motivation,likes_zenciaka,applicant_age,first_name,about,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (ticketResult.error) {
      setAdminMessage(ticketResult.error.message);
    } else {
      setTickets((ticketResult.data ?? []) as SupportTicket[]);
    }

    if (applicationResult.error) {
      setAdminMessage(applicationResult.error.message);
    } else {
      setApplications(
        (applicationResult.data ?? []) as RecruitmentApplication[]
      );
    }

    setAdminLoading(false);
  }, [supabase, isAdmin]);

  useEffect(() => {
    if (activeTab === "forum") loadForum();
    if (activeTab === "announcements") loadAnnouncements();
    if (activeTab === "trappers") loadTrappers();
    if (
      (activeTab === "support-admin" || activeTab === "recruitment-admin") &&
      isAdmin
    ) {
      loadAdminSubmissions();
    }
  }, [
    activeTab,
    isAdmin,
    loadForum,
    loadAnnouncements,
    loadTrappers,
    loadAdminSubmissions,
  ]);

  // Publikowanie postu na forum.
  async function submitForumPost() {
    if (!loggedIn) {
      setForumMessage(t.loginFirst);
      return;
    }

    if (!forumContent.trim()) {
      setForumMessage(t.fillFields);
      return;
    }

    setForumSending(true);
    setForumMessage("");

    const { error } = await supabase.rpc("create_forum_post", {
      p_content: forumContent.trim(),
    });

    setForumSending(false);

    if (error) {
      setForumMessage(error.message || t.forumError);
      return;
    }

    setForumContent("");
    setForumMessage(t.success);
    await loadForum();
  }

  // WysĹ‚anie zgĹ‚oszenia do administracji.
  async function submitAnnouncement() {
    if (!isAdmin || !loggedIn) return;
    if (announcementTitle.trim().length < 3 || announcementContent.trim().length < 5) {
      setAnnouncementMessage("Tytuł musi mieć min. 3 znaki, a treść min. 5 znaków.");
      return;
    }
    setAnnouncementSending(true);
    setAnnouncementMessage("");
    const { error } = await supabase.from("site_announcements").insert({
      title: announcementTitle.trim(), content: announcementContent.trim(), created_by: userId,
    });
    setAnnouncementSending(false);
    if (error) { setAnnouncementMessage(error.message); return; }
    setAnnouncementTitle(""); setAnnouncementContent("");
    setAnnouncementMessage("Ogłoszenie zostało opublikowane.");
    await loadAnnouncements();
  }

  async function deleteAnnouncement(id: string) {
    if (!isAdmin) return;
    if (!window.confirm("Usunąć to ogłoszenie?")) return;
    const { error } = await supabase.from("site_announcements").delete().eq("id", id);
    if (error) { setAnnouncementMessage(error.message); return; }
    setAnnouncementMessage("Ogłoszenie usunięto.");
    await loadAnnouncements();
  }

  async function submitTicket() {
    if (!loggedIn) {
      setTicketMessage(t.loginFirst);
      return;
    }

    if (ticketSubject.trim().length < 3 || ticketContent.trim().length < 5) {
      setTicketMessage(t.fillFields);
      return;
    }

    setTicketSending(true);
    setTicketMessage("");

    const { error } = await supabase.from("support_tickets").insert({
      user_id: userId,
      subject: ticketSubject.trim(),
      category: ticketCategory,
      priority: ticketPriority,
      related_order: ticketOrder.trim() || null,
      page_url: typeof window !== "undefined" ? window.location.href : null,
      message: ticketContent.trim(),
    });

    setTicketSending(false);

    if (error) {
      setTicketMessage(error.message || t.ticketError);
      return;
    }

    setTicketSubject("");
    setTicketCategory("other");
    setTicketPriority("normal");
    setTicketOrder("");
    setTicketContent("");
    setTicketMessage(t.success);
  }

  // WysĹ‚anie rekrutacji.
  async function submitApplication() {
    if (!loggedIn) {
      setApplicationMessage(t.loginFirst);
      return;
    }

    if (
      applicationNick.trim().length < 1 ||
      applicationExperience.trim().length < 10 ||
      applicationMotivation.trim().length < 10 ||
      likesZenciaka === null ||
      applicantFirstName.trim().length < 1 ||
      !/^[0-9]{1,2}$/.test(applicantAge) ||
      Number(applicantAge) < 13 || Number(applicantAge) > 99 ||
      applicantAbout.trim().split(/[.!?]+/).filter((sentence) => sentence.trim().length > 0).length < 5
    ) {
      setApplicationMessage(t.fillFields);
      return;
    }

    setApplicationSending(true);
    setApplicationMessage("");

    const { error } = await supabase
      .from("recruitment_applications")
      .insert({
        user_id: userId,
        minecraft_nick: applicationNick.trim(),
        experience: applicationExperience.trim(),
        motivation: applicationMotivation.trim(),
        likes_zenciaka: likesZenciaka,
        applicant_age: Number(applicantAge),
        first_name: applicantFirstName.trim(),
        about: applicantAbout.trim(),
      });

    setApplicationSending(false);

    if (error) {
      setApplicationMessage(error.message || t.applicationError);
      return;
    }

    setApplicationNick("");
    setApplicationExperience("");
    setApplicationMotivation("");
    setLikesZenciaka(null);
    setApplicantAge("");
    setApplicantFirstName("");
    setApplicantAbout("");
    setApplicationMessage(t.success);
  }

  // Zmiana statusu zgĹ‚oszenia przez administratora.
  async function updateTicketStatus(id: string, status: string) {
    if (!isAdmin) return;

    const { error } = await supabase
      .from("support_tickets")
      .update({ status })
      .eq("id", id);

    if (error) {
      setAdminMessage(error.message);
      return;
    }

    setAdminMessage(t.statusUpdated);
    await loadAdminSubmissions();
  }

  async function updateApplicationStatus(id: string, status: string) {
    if (!isAdmin) return;

    const { error } = await supabase
      .from("recruitment_applications")
      .update({ status })
      .eq("id", id);

    if (error) {
      setAdminMessage(error.message);
      return;
    }

    setAdminMessage(t.statusUpdated);
    await loadAdminSubmissions();
  }

  // Zamówienia.
  const discount = userRole === "admin" || userRole === "owner"
    ? selected?.id === "forever" ? 20 : 30
    : 0;

  const finalPrice = selected
    ? Number((selected.price * (100 - discount) / 100).toFixed(2))
    : 0;

  const paymentCommand = selected
    ? `/pay MrCapybaraMc ${formatPrice(finalPrice)}`
    : "";

  function choosePackage(pkg: Package) {
    setSelected(pkg);
    setMinecraftNick("");
    setCopied(false);
    setOrderMessage("");
    setOrderSuccess(false);

    setTimeout(() => {
      document.getElementById("payment")?.scrollIntoView({
        behavior: "smooth",
      });
    }, 100);
  }

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(paymentCommand);
      setCopied(true);
    } catch {
      setOrderMessage(
        language === "pl"
          ? "Nie udało się skopiować komendy. Skopiuj ją ręcznie."
          : "Could not copy the command. Please copy it manually."
      );
    }
  }

  async function submitOrder() {
    if (!selected) return;

    if (!loggedIn) {
      setOrderMessage(t.loginFirst);
      return;
    }

    if (!minecraftNick.trim()) {
      setOrderMessage(t.nickRequired);
      return;
    }

    setSubmitting(true);
    setOrderMessage("");

    const { data, error } = await supabase.rpc("create_order", {
      p_minecraft_nick: minecraftNick.trim(),
      p_package_type: selected.id,
      p_discount_code: "",
    });

    setSubmitting(false);

    if (error) {
      setOrderMessage(error.message || t.orderError);
      return;
    }

    const result = data as { order_id: string };

    setOrderSuccess(true);
    setOrderMessage(
      language === "pl"
        ? `Zamówienie zostało wysłane! Numer: ${result.order_id}`
        : `Order submitted! Order number: ${result.order_id}`
    );
  }

  async function claimDailyReward() {
    if (!loggedIn) { setDailyMessage("Zaloguj się, aby odbierać punkty Daily."); return; }
    setDailyBusy(true); setDailyMessage("");
    const { data, error } = await supabase.rpc("claim_daily_reward");
    if (error) setDailyMessage(error.message);
    else { const result = Array.isArray(data) ? data[0] : data; setDailyMessage(`Odebrano ${result.points_awarded} punktów! Seria: ${result.streak_days} dni.`); await loadProfile(userId); }
    setDailyBusy(false);
  }

  async function redeemDailyAccess() {
    if (!loggedIn) { setDailyMessage("Zaloguj się, aby wymienić punkty."); return; }
    if (!window.confirm("Wymienić 2150 punktów na 24 godziny dostępu TrapMaster?")) return;
    setDailyBusy(true); setDailyMessage("");
    const { data, error } = await supabase.rpc("redeem_daily_access");
    if (error) setDailyMessage(error.message);
    else { setDailyMessage(`Wymieniono punkty! Dostęp do ${new Date(data.expires_at).toLocaleString("pl-PL")}.`); await loadProfile(userId); }
    setDailyBusy(false);
  }

  async function redeemPointsShop(itemId: string) {
    const labels: Record<string, string> = { access_24h: "24 godziny", access_7d: "7 dni", access_30d: "30 dni" };
    if (!window.confirm("Wymienić punkty na dostęp TrapMaster: " + (labels[itemId] || itemId) + "?")) return;
    setDailyBusy(true); setDailyMessage("");
    const { data, error } = await supabase.rpc("redeem_points_shop", { p_item_id: itemId });
    if (error) setDailyMessage(error.message);
    else {
      setDailyMessage("Zakupiono " + data.title + ". Dostęp do: " + new Date(data.expires_at).toLocaleString("pl-PL"));
      await loadProfile(userId);
    }
    setDailyBusy(false);
  }

  function openTab(tab: Tab) {
    if (tab === "forum") {
      router.push("/forum");
      return;
    }
    if (tab === "updates") {
      router.push("/aktualizacje");
      return;
    }
    if (tab === "announcements") {
      router.push("/ogloszenia");
      return;
    }
    if (pathname !== "/") router.push("/");
    setActiveTab(tab);

    setTimeout(() => {
      document.getElementById("community")?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  }

  const tabItems: { id: Tab; label: string }[] = [
    { id: "forum", label: t.forum },
    { id: "updates", label: "Aktualizacje" },
    { id: "announcements", label: "Ogłoszenia" },
    { id: "trappers", label: t.trappers },
    { id: "help", label: t.help },
    { id: "recruitment", label: t.recruitment },
    { id: "creators", label: t.creators },
    { id: "daily", label: t.daily },
  ];

  if (isAdmin) {
    tabItems.push(
      { id: "support-admin", label: t.supportAdmin },
      { id: "recruitment-admin", label: t.recruitmentAdmin }
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#070910] text-white">
      <style jsx global>{`
        @keyframes creator-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        @keyframes redstone-fall {
          0% { transform: translateY(-40px) rotate(0deg); opacity: 0; }
          10% { opacity: .65; }
          90% { opacity: .65; }
          100% { transform: translateY(420px) rotate(180deg); opacity: 0; }
        }

        .creator-track {
          animation: creator-scroll 24s linear infinite;
          width: max-content;
        }

        .creator-track:hover {
          animation-play-state: paused;
        }

        .redstone-piece {
          position: absolute;
          top: -40px;
          animation: redstone-fall 8s linear infinite;
          pointer-events: none;
          opacity: 0;
        }
      `}</style>

      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          key={selected ? "offer" : "background"}
          autoPlay
          muted={!musicEnabled}
          loop
          playsInline
          className="h-full w-full object-cover opacity-60"
        >
          <source
            src={selected ? "/videos/oferta.mp4" : "/videos/ender-bg.mp4"}
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-[#070910]/45" />
      </div>

      <div className="relative z-10">
        {/* NAWIGACJA */}
        <header className="border-b border-white/10 bg-black/35 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
            <a href="/" className="text-2xl font-black tracking-wider">
              TRAP<span className="text-purple-500">MASTERS</span>
            </a>

            <nav className="flex flex-wrap items-center gap-4 text-sm text-gray-200">
              <a href="#oferta" className="hover:text-purple-400">
                {t.offer}
              </a>
              <a href="#trapmaster" className="hover:text-purple-400">
                {t.trapmaster}
              </a>
              <a href="#informacje" className="hover:text-purple-400">
                {t.info}
              </a>
              <button onClick={() => openTab("forum")} className="hover:text-purple-400">
                {t.forum}
              </button>
              <button onClick={() => openTab("daily")} className="hover:text-amber-300">{t.daily}</button>
              <button onClick={() => openTab("updates")} className="hover:text-purple-300">Aktualizacje</button>
              <button onClick={() => openTab("announcements")} className="hover:text-amber-300">Ogłoszenia</button>

              {loggedIn && (
                <a href="/account" className="font-bold text-purple-300">
                  {t.account}
                </a>
              )}

              {loggedIn && hasTrapperAccess && (
                <a
                  href="/trapmaster"
                  className="rounded-lg border border-purple-400/50 bg-purple-600/20 px-4 py-2 font-bold text-purple-200"
                >
                  {t.trapper}
                </a>
              )}

              {isAdmin && (
                <a href="/admin" className="font-bold text-cyan-300">
                  Zamówienia
                </a>
              )}

              {userRole === "owner" && (
                <a href="/owner" className="font-bold text-yellow-300">
                  Panel ownera
                </a>
              )}

              <a
                href="https://www.youtube.com/@MrCapybara-s"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-red-400"
              >
                YouTube
              </a>

              <a href="https://discord.gg/sJaBPzx36" target="_blank" rel="noreferrer">
                Discord
              </a>
            </nav>

            {authLoading ? (
              <span className="text-sm text-gray-400">{t.loading}</span>
            ) : loggedIn ? (
              <a href="/account" className="flex items-center gap-3 rounded-xl border border-green-400/40 bg-green-500/15 px-4 py-2.5 text-sm font-bold text-green-300">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full border border-green-300/40 object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-green-500/20"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-3.5 3.1-5.3 7-5.3s6.3 1.8 7 5.3"/></svg></span>}
                <span>{profile?.nickname || t.myAccount}</span>
              </a>
            ) : (
              <a
                href="/register"
                className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold hover:bg-purple-500"
              >
                {t.login}
              </a>
            )}
          </div>
        </header>

        {settingsLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            {t.loadingAccess}
          </div>
        ) : paused ? (
          <section className="flex min-h-[75vh] flex-col items-center justify-center px-6 text-center">
            <div className="max-w-2xl rounded-3xl border border-red-400/40 bg-black/75 p-10 backdrop-blur-sm">
              <div className="text-5xl">🔧</div>
              <h1 className="mt-6 text-4xl font-black md:text-5xl">{t.paused}</h1>
              <p className="mt-5 leading-7 text-white/75">{t.pausedText}</p>
              <a
                href="https://discord.gg/sJaBPzx36"
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-block rounded-xl bg-purple-600 px-8 py-4 font-bold"
              >
                {t.discord}
              </a>
            </div>
          </section>
        ) : (
          <>
            {/* HERO */}
            <section className="mx-auto flex min-h-[650px] max-w-7xl flex-col items-center justify-center px-6 py-24 text-center">
              <div className="mb-6 rounded-full border border-purple-400/50 bg-purple-950/40 px-5 py-2 text-sm text-purple-200">
                {t.heroLabel}
              </div>

              <h1 className="text-5xl font-black leading-tight md:text-7xl">
                {t.heroTitle}
                <span className="block text-purple-400">{t.heroTitle2}</span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-white drop-shadow-lg">
                {t.heroDescription}
              </p>

              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <a href="#oferta" className="rounded-xl bg-purple-600 px-8 py-4 font-bold">
                  {t.seeOffer}
                </a>
                <a
                  href={loggedIn ? "/account" : "/register"}
                  className="rounded-xl border border-white/30 bg-black/40 px-8 py-4 font-bold"
                >
                  {t.myAccount}
                </a>
                <a href="/forum" className="rounded-xl border border-purple-400/50 bg-purple-950/50 px-8 py-4 font-bold text-purple-200 hover:bg-purple-900/60">
                  FORUM
                </a>
                <a href="/aktualizacje" className="rounded-xl border border-purple-400/50 bg-purple-950/50 px-8 py-4 font-bold text-purple-200 hover:bg-purple-900/60">
                  AKTUALIZACJE
                </a>
                <a href="/ogloszenia" className="rounded-xl border border-amber-400/50 bg-amber-950/40 px-8 py-4 font-bold text-amber-200 hover:bg-amber-900/50">
                  OGŁOSZENIA
                </a>
              </div>
            </section>

            {/* OFERTA */}
            <section id="oferta" className="mx-auto max-w-7xl px-6 py-24">
              <div className="mb-14 text-center">
                <p className="mb-3 font-bold tracking-[0.3em] text-purple-300">
                  {t.choosePlan}
                </p>
                <h2 className="text-4xl font-black md:text-5xl">{t.ourOffer}</h2>
                <p className="mt-4 text-white/80">{t.offerDescription}</p>
              </div>

              <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative flex flex-col rounded-3xl border p-8 backdrop-blur-sm transition hover:-translate-y-2 ${
                      pkg.popular
                        ? "border-purple-400/70 bg-purple-950/45"
                        : "border-white/20 bg-black/40"
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-purple-600 px-5 py-2 text-xs font-black">
                        {t.popular}
                      </div>
                    )}

                    <h3 className="mt-3 text-xl font-black">{packageTranslations[language][pkg.id].name}</h3>
                    <p className="mt-3 text-sm text-white/75">{packageTranslations[language][pkg.id].description}</p>

                    <div className="my-8">
                      <span className="text-5xl font-black text-purple-300">
                        {formatPrice(pkg.price)}
                      </span>
                      <p className="mt-2 text-sm text-white/70">{t.serverDollars}</p>
                    </div>

                    <p className="mb-8 text-sm text-white/85">{packageTranslations[language][pkg.id].duration}</p>

                    <button
                      onClick={() => choosePackage(pkg)}
                      className="mt-auto w-full rounded-xl bg-purple-600 py-4 font-bold hover:bg-purple-500"
                    >
                      {t.choose}
                    </button>
                  </div>
                ))}
              </div>

    <p className="mt-8 text-center text-sm text-white/70">
  {language === "pl"
    ? "Płatności przyjmowane są w dolarach serwerowych BananaSMP.pl."
    : "Payments are accepted in BananaSMP.pl server dollars."}
</p>
            </section>

            {/* PĹATNOĹšÄ† */}
            {selected && (
              <section id="payment" className="mx-auto max-w-3xl px-6 py-20">
                <div className="rounded-3xl border border-purple-400/50 bg-[#100d20]/95 p-8 text-center backdrop-blur-sm md:p-12">
                  <p className="font-bold tracking-[0.25em] text-purple-300">
                    {t.paymentTitle}
                  </p>
                  <h2 className="mt-5 text-4xl font-black">{selected.name}</h2>
                  <p className="mt-3 text-white/70">{selected.duration}</p>

                  <div className="mt-8 text-left">
                    <label className="mb-2 block text-sm text-white/80">
                      {t.minecraftNick}
                    </label>
                    <input
                      value={minecraftNick}
                      onChange={(e) => setMinecraftNick(e.target.value)}
                      maxLength={16}
                      placeholder="MrCapybara"
                      className="w-full rounded-xl border border-white/20 bg-black/50 px-4 py-4 text-white outline-none focus:border-purple-400"
                    />
                  </div>


                  <div className="mt-8 rounded-xl border border-white/15 bg-black/40 p-5">
                    <p className="text-white/70">{t.priceToPay}</p>
                    <p className="mt-2 text-4xl font-black text-purple-300">
                      {formatPrice(finalPrice)}
                    </p>
                    {discount > 0 && (
                      <p className="mt-2 text-sm text-green-300">
                        {language === "pl" ? `Zniżka dla ${userRole === "owner" ? "Ownera" : "administratora"}: ${discount}%` : `${userRole === "owner" ? "Owner" : "Administrator"} discount: ${discount}%`}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-white/60">{t.serverDollars}</p>
                  </div>

                  <div className="mt-8 rounded-xl border border-white/15 bg-black/40 p-5">
                    <p className="mb-3 text-sm text-white/70">{t.paymentCommand}</p>
                    <code className="break-all text-lg font-bold text-purple-300">
                      {paymentCommand}
                    </code>
                    <button
                      onClick={copyCommand}
                      className="mt-5 w-full rounded-xl bg-purple-600 py-3 font-bold hover:bg-purple-500"
                    >
                      {copied ? t.copied : t.copy}
                    </button>
                  </div>

                  <div className="mt-6 rounded-xl border border-purple-400/30 bg-purple-950/40 p-5 text-left">
                    <h3 className="font-bold text-purple-200">{t.howToPay}</h3>
                    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-white/80">
                      <li>{t.pay1}</li>
                      <li>{t.pay2}</li>
                      <li>{t.pay3}</li>
                      <li>{t.pay4}</li>
                    </ol>
                  </div>

                  <div className="mt-6 rounded-xl border border-white/15 bg-black/40 p-5">
                    <p className="font-bold">{t.processing}</p>
                    <p className="mt-2 text-sm leading-6 text-white/75">
                      {t.processingText}
                    </p>
                  </div>

                  {orderMessage && (
                    <div
                      className={`mt-6 rounded-xl border p-4 text-sm ${
                        orderSuccess
                          ? "border-green-400/40 bg-green-500/10 text-green-200"
                          : "border-red-400/40 bg-red-500/10 text-red-200"
                      }`}
                    >
                      {orderMessage}
                    </div>
                  )}

                  {!orderSuccess && (
                    <button
                      onClick={submitOrder}
                      disabled={submitting || !loggedIn}
                      className="mt-7 w-full rounded-xl bg-green-600 py-4 font-bold hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? t.sending : t.sendOrder}
                    </button>
                  )}

                  {!loggedIn && (
                    <p className="mt-4 text-sm text-yellow-200">
                      {t.loginRequired}
                      <a href="/register" className="ml-1 underline">
                        {t.login}
                      </a>
                    </p>
                  )}

                  <button
                    onClick={() => {
                      setSelected(null);
                      setCopied(false);
                      setOrderMessage("");
                      setOrderSuccess(false);
                    }}
                    className="mt-7 text-sm text-white/70 underline"
                  >
                    {t.back}
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {/* TRAPMASTER */}
        <section
          id="trapmaster"
          className="border-y border-purple-400/20 bg-[#100b20]/90 px-6 py-24 backdrop-blur-md"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-5 inline-block rounded-full border border-purple-400/40 bg-purple-950/60 px-5 py-2 text-sm font-bold tracking-widest text-purple-200">
                INTELIGENTNY ASYSTENT MINECRAFT
              </div>

              <h2 className="text-4xl font-black md:text-6xl">
                {t.stepsTitle} <span className="text-purple-400">TRAPMASTER?</span>
              </h2>

              <p className="mt-7 text-lg leading-8 text-white/80">
                {t.stepsIntro}
              </p>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: "📦", step: language === "en" ? "STEP 01" : "KROK 01", description: t.step1 },
                { icon: "📨", step: language === "en" ? "STEP 02" : "KROK 02", description: t.step2 },
                { icon: "🤖", step: language === "en" ? "STEP 03" : "KROK 03", description: t.step3 },
                { icon: "🗺️", step: language === "en" ? "STEP 04" : "KROK 04", description: t.step4 },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-purple-400/25 bg-black/50 p-7 transition hover:-translate-y-1 hover:border-purple-400/60"
                >
                  <div className="text-4xl">{item.icon}</div>
                  <p className="mt-5 text-sm font-black tracking-widest text-purple-300">
                    {item.step}
                  </p>
                  <p className="mt-4 leading-7 text-white/80">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mx-auto mt-14 max-w-4xl rounded-2xl border border-purple-400/30 bg-purple-950/50 p-8 text-center">
              <p className="text-xl font-black leading-8 text-purple-200 md:text-2xl">
                {t.stepsBottom}
              </p>

              {loggedIn && hasTrapperAccess ? (
                <a
                  href="/trapmaster"
                  className="mt-8 inline-block rounded-xl bg-purple-600 px-9 py-4 font-black hover:bg-purple-500"
                >
                  {t.stepsButton}
                </a>
              ) : (
                <a
                  href="#oferta"
                  className="mt-8 inline-block rounded-xl border border-purple-400/50 px-9 py-4 font-black hover:bg-purple-500/20"
                >
                  {t.seeOffer}
                </a>
              )}
            </div>
          </div>
        </section>

        {/* INFORMACJE */}
        <section id="informacje" className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-6 md:grid-cols-2">

            {/* KARTA INFORMACYJNA */}
            <div className="rounded-3xl border border-white/20 bg-black/50 p-8 backdrop-blur-md">
              <div className="mb-5 text-3xl">ℹ️</div>
              <h3 className="text-2xl font-black">{t.infoTitle}</h3>

              <p className="mt-4 leading-7 text-white/85">{t.infoText}</p>

              <p className="mt-4 leading-7 text-white/85">
                {language === "pl"
                  ? "TRAPMASTERS jest niezależnym projektem społecznościowym. Nie jest oficjalną stroną BananaSMP.pl i nie jest przez ten serwer prowadzony ani wspierany."
                  : "TRAPMASTERS is an independent community project. It is not the official BananaSMP.pl website and is not operated or endorsed by that server."}
              </p>

              <p className="mt-4 text-sm text-white/70">
                {language === "pl" ? "Kontakt: " : "Contact: "}
                mrcapybarasyt@gmail.com
              </p>
            </div>

            {/* KARTA ADMINISTRACJI */}
            <div className="rounded-3xl border border-white/20 bg-black/50 p-8 backdrop-blur-md">
              <div className="mb-5 text-3xl">👥</div>
              <h3 className="text-2xl font-black">{t.adminsTitle}</h3>
              <p className="mt-4 leading-7 text-white/85">{t.adminsText}</p>
            </div>

          </div>
          </section>

        <section
          id="community"
          className="relative overflow-hidden border-y border-purple-400/20 bg-[#090914]/95 px-6 py-20 backdrop-blur-md"
        >
        


          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="mb-10 text-center">
              <p className="font-bold tracking-[0.3em] text-purple-300">
                TRAPMASTERS COMMUNITY
              </p>
              <h2 className="mt-3 text-4xl font-black md:text-5xl">
                SPOŁECZNOŚĆ
              </h2>
            </div>

            {/* Przyciski zakĹ‚adek */}
            <div className="mb-10 flex flex-wrap justify-center gap-3">
              {tabItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => openTab(item.id)}
                  className={`rounded-xl border px-5 py-3 text-sm font-bold transition ${
                    activeTab === item.id
                      ? "border-purple-400 bg-purple-600 text-white"
                      : "border-white/20 bg-black/50 text-white/75 hover:border-purple-400/60"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* FORUM */}
            {activeTab === "forum" && (
              <div className="relative overflow-hidden rounded-3xl border border-purple-400/30 bg-black/70 p-6 backdrop-blur-md md:p-10">
                <h3 className="text-3xl font-black text-purple-200">{t.forumTitle}</h3>
                <p className="mt-3 text-white/70">{t.forumDescription}</p>

                <div className="mt-8 rounded-2xl border border-white/15 bg-[#11111c]/95 p-5">
                  <textarea
                    value={forumContent}
                    onChange={(e) => setForumContent(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder={t.forumPlaceholder}
                    className="w-full resize-y rounded-xl border border-white/15 bg-black/50 p-4 text-white outline-none focus:border-purple-400"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-white/50">
                      {forumContent.length}/2000
                    </span>
                    <button
                      onClick={submitForumPost}
                      disabled={forumSending}
                      className="rounded-xl bg-purple-600 px-7 py-3 font-bold hover:bg-purple-500 disabled:opacity-50"
                    >
                      {forumSending ? t.sending : t.send}
                    </button>
                  </div>
                  {forumMessage && (
                    <p className="mt-3 text-sm text-purple-200">{forumMessage}</p>
                  )}
                  {!loggedIn && (
                    <p className="mt-3 text-sm text-yellow-200">{t.loginFirst}</p>
                  )}
                </div>

                <div className="mt-8 space-y-4">
                  {forumLoading ? (
                    <p className="text-white/60">{t.loading}</p>
                  ) : forumPosts.length === 0 ? (
                    <p className="rounded-xl border border-white/10 bg-black/30 p-6 text-center text-white/60">
                      {t.noPosts}
                    </p>
                  ) : (
                    forumPosts.map((post) => (
                      <article
                        key={post.id}
                        className="rounded-2xl border border-purple-400/20 bg-[#11111c]/95 p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            {post.author_avatar_url ? <img src={post.author_avatar_url} alt="" className="h-10 w-10 rounded-full border border-purple-300/30 object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-purple-900 text-lg">👤</div>}
                            <span className="truncate font-bold text-purple-200">{post.author_name}</span>
                          </div>
                          <span className="text-xs text-white/45">
                            {formatDate(post.created_at, language)}
                          </span>
                        </div>
                        <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-white/85">
                          {post.content}
                        </p>
                        {isAdmin && (
                          <button onClick={() => deleteForumPost(post.id)} className="mt-4 rounded-lg border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/10">
                            Usuń post
                          </button>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "updates" && (
              <div className="rounded-3xl border border-purple-400/30 bg-black/75 p-6 backdrop-blur-md md:p-10">
                <p className="text-xs font-black uppercase tracking-[.3em] text-purple-300">DZIENNIK ZMIAN TRAPMASTERS</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <h3 className="text-3xl font-black">Aktualizacje</h3>
                  <span className="rounded-full border border-green-400/30 bg-green-500/10 px-4 py-2 text-sm font-black text-green-300">Aktualna wersja: v.beta.09</span>
                </div>
                <article className="mt-8 rounded-2xl border border-purple-400/25 bg-[#11111c] p-6">
                  <h4 className="text-2xl font-black text-purple-200">v.beta.09</h4>
                  <p className="mt-4 text-sm font-bold uppercase tracking-wider text-white/70">Co się zmieniło?</p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-white/80">
                    <li>Dodano zakładkę „Aktualizacje” z historią wersji i opisem zmian.</li>
                    <li>Dodano zakładkę „Ogłoszenia” widoczną dla wszystkich odwiedzających.</li>
                    <li>Administratorzy mogą publikować i usuwać ogłoszenia.</li>
                    <li>Dodano zabezpieczenia bazy danych, aby zarządzanie ogłoszeniami było dostępne wyłącznie dla administratorów.</li>
                  </ul>
                </article>
              </div>
            )}

            {activeTab === "announcements" && (
              <div className="rounded-3xl border border-amber-400/30 bg-black/75 p-6 backdrop-blur-md md:p-10">
                <p className="text-xs font-black uppercase tracking-[.3em] text-amber-300">TRAPMASTERS • TABLICA INFORMACYJNA</p>
                <h3 className="mt-3 text-3xl font-black text-amber-100">Ogłoszenia</h3>
                <p className="mt-2 text-white/65">Najnowsze informacje od administracji TRAPMASTERS.</p>
                {isAdmin && (
                  <div className="mt-8 rounded-2xl border border-amber-300/25 bg-[#17130c] p-5">
                    <h4 className="text-xl font-black text-amber-200">Panel publikowania ogłoszeń</h4>
                    <label className="mt-5 block text-sm font-bold">Tytuł ogłoszenia
                      <input value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} maxLength={120} placeholder="Wpisz tytuł..." className="mt-2 w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 outline-none focus:border-amber-300" />
                    </label>
                    <label className="mt-4 block text-sm font-bold">Treść ogłoszenia
                      <textarea value={announcementContent} onChange={(e) => setAnnouncementContent(e.target.value)} maxLength={5000} rows={5} placeholder="Napisz ogłoszenie dla społeczności..." className="mt-2 w-full resize-y rounded-xl border border-white/15 bg-black/50 px-4 py-3 outline-none focus:border-amber-300" />
                    </label>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-white/45">{announcementContent.length}/5000</span>
                      <button onClick={submitAnnouncement} disabled={announcementSending} className="rounded-xl bg-amber-500 px-6 py-3 font-black text-black hover:bg-amber-400 disabled:opacity-50">{announcementSending ? "Publikowanie..." : "Opublikuj ogłoszenie"}</button>
                    </div>
                    {announcementMessage && <p className="mt-3 text-sm text-amber-200">{announcementMessage}</p>}
                  </div>
                )}
                <div className="mt-8 space-y-4">
                  {announcementsLoading ? <p className="text-white/60">{t.loading}</p> :
                   announcements.length === 0 ? <p className="rounded-xl border border-white/10 bg-black/30 p-6 text-center text-white/60">Nie ma jeszcze żadnych ogłoszeń.</p> :
                   announcements.map((announcement) => (
                    <article key={announcement.id} className="rounded-2xl border border-amber-300/20 bg-[#11111c] p-5 md:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h4 className="text-xl font-black text-amber-100">{announcement.title}</h4>
                        <span className="text-xs text-white/45">{formatDate(announcement.created_at, language)}</span>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-white/85">{announcement.content}</p>
                      {isAdmin && <button onClick={() => deleteAnnouncement(announcement.id)} className="mt-5 rounded-lg border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/10">Usuń ogłoszenie</button>}
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* DAILY */}
            {activeTab === "daily" && (
              <div className="relative isolate overflow-hidden rounded-3xl border border-amber-300/30 bg-[#17120a] p-6 shadow-2xl md:p-10">
                <video autoPlay muted loop playsInline className="absolute inset-0 -z-20 h-full w-full object-cover opacity-35"><source src="/videos/daily.mp4" type="video/mp4" /></video>
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#100d08]/90 via-[#16100b]/85 to-purple-950/70" />
                <div className="relative">
                  <p className="text-xs font-black uppercase tracking-[.35em] text-amber-300">TRAPMASTERS REWARDS</p>
                  <h3 className="mt-3 text-4xl font-black md:text-5xl">DAILY <span className="text-amber-300">REWARDS</span></h3>
                  <p className="mt-3 max-w-2xl text-white/75">Odbieraj punkty każdego dnia, buduj serię logowań i wymieniaj punkty na czasowy dostęp do TrapMastera.</p>
                  {loggedIn ? <>
                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-2xl border border-amber-300/20 bg-black/45 p-5"><p className="text-sm text-white/55">Twoje punkty</p><p className="mt-2 text-4xl font-black text-amber-200">{profile?.points ?? 0}</p></div>
                      <div className="rounded-2xl border border-amber-300/20 bg-black/45 p-5"><p className="text-sm text-white/55">Seria logowań</p><p className="mt-2 text-4xl font-black">{profile?.daily_streak ?? 0} <span className="text-base font-semibold text-white/60">dni</span></p></div>
                      <div className="rounded-2xl border border-amber-300/20 bg-black/45 p-5"><p className="text-sm text-white/55">Dzisiejsza nagroda</p><p className="mt-2 text-4xl font-black text-amber-200">{(profile?.daily_streak ?? 0) >= 13 ? 150 : (profile?.daily_streak ?? 0) >= 4 ? 100 : 50} <span className="text-base font-semibold text-white/60">pkt</span></p></div>
                    </div>
                    <div className="mt-7 flex flex-wrap gap-3">
                      <button onClick={claimDailyReward} disabled={dailyBusy || profile?.last_daily_claim === new Date().toISOString().slice(0,10)} className="rounded-xl bg-amber-300 px-7 py-4 font-black text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40">{profile?.last_daily_claim === new Date().toISOString().slice(0,10) ? "NAGRODA ODEBRANA DZISIAJ" : dailyBusy ? "CHWILA..." : "ODBIERZ DZIENNĄ NAGRODĘ"}</button>
                      <a href="/account" className="rounded-xl border border-white/15 bg-white/5 px-6 py-4 font-bold text-white/80 hover:bg-white/10">Moje konto</a>
                    </div>
                  </> : <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-6"><p className="text-white/80">Zaloguj się, aby zbierać punkty i odbierać nagrody.</p><a href="/register" className="mt-4 inline-block rounded-xl bg-amber-300 px-6 py-3 font-black text-black">ZALOGUJ SIĘ</a></div>}
                  {loggedIn && (
                    <section className="mt-9 rounded-2xl border border-purple-300/20 bg-black/40 p-5 md:p-7">
                      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.25em] text-purple-300">PUNKTY</p><h4 className="mt-2 text-2xl font-black">SKLEP NAGRÓD</h4><p className="mt-1 text-sm text-white/55">Wymieniaj punkty na dodatkowy czas dostępu.</p></div><span className="font-bold text-amber-200">{profile?.points ?? 0} pkt</span></div>
                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {[{id:"access_24h",name:"TrapMaster 24 godziny",cost:2150,detail:"1 dzień dostępu"},{id:"access_7d",name:"TrapMaster 7 dni",cost:12000,detail:"Tydzień dostępu"},{id:"access_30d",name:"TrapMaster 30 dni",cost:40000,detail:"Miesiąc dostępu"}].map((item) => (
                          <article key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <h5 className="font-bold">{item.name}</h5><p className="mt-1 text-sm text-white/50">{item.detail}</p>
                            <p className="mt-4 text-xl font-black text-amber-200">{item.cost.toLocaleString("pl-PL")} pkt</p>
                            <button onClick={() => redeemPointsShop(item.id)} disabled={dailyBusy || (profile?.points ?? 0) < item.cost} className="mt-3 w-full rounded-lg bg-purple-600 px-4 py-3 font-bold disabled:opacity-40">Wymień punkty</button>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}
                  <div className="mt-7 grid gap-3 text-sm text-white/70 sm:grid-cols-3">
                    <div className="rounded-xl bg-black/30 p-4">Dni 1–4 <strong className="block text-xl text-amber-200">50 pkt / dzień</strong></div>
                    <div className="rounded-xl bg-black/30 p-4">Dni 5–13 <strong className="block text-xl text-amber-200">100 pkt / dzień</strong></div>
                    <div className="rounded-xl bg-black/30 p-4">Od dnia 14 <strong className="block text-xl text-amber-200">150 pkt / dzień</strong></div>
                  </div>
                  {dailyMessage && <p className="mt-5 rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/90">{dailyMessage}</p>}
                  <p className="mt-4 text-xs text-white/40">2150 punktów = 24 godziny dostępu. Przy codziennym odbieraniu nagród można uzbierać tę kwotę w 20 dni.</p>
                </div>
              </div>
            )}
            {/* TRAPMASTERZY */}
            {activeTab === "trappers" && (
              <div className="rounded-3xl border border-purple-400/30 bg-black/70 p-6 backdrop-blur-md md:p-10">
                <h3 className="text-3xl font-black text-purple-200">
                  {t.trappersTitle}
                </h3>
                <p className="mt-3 text-sm text-white/60">
                  {language === "pl"
                    ? "Lista kont posiadających aktywny dostęp do narzędzia."
                    : "Accounts with active access to the tool."}
                </p>

                {trappersLoading ? (
                  <p className="mt-8 text-white/60">{t.loading}</p>
                ) : trappers.length === 0 ? (
                  <p className="mt-8 rounded-xl border border-white/10 bg-black/40 p-6 text-white/60">
                    {t.noTrappers}
                  </p>
                ) : (
                  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {trappers.map((trapper, index) => (
                      <div
                        key={`${trapper.display_name}-${index}`}
                        className="rounded-2xl border border-purple-400/25 bg-[#11111c] p-6"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-950 text-3xl">🧑‍💻</div>
                          <div className="min-w-0">
                            <h4 className="truncate font-black text-purple-200">
                              {trapper.display_name}
                            </h4>
                            <p className="mt-1 text-xs text-white/60">
                              {trapper.access_type}
                            </p>
                          </div>
                        </div>
                        <p className="mt-5 text-xs text-white/50">
                          {t.expires}: {formatDate(trapper.expires_at, language)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* POMOC */}
            {activeTab === "help" && (
              <div className="relative overflow-hidden rounded-3xl border border-purple-400/30 bg-black/75 p-6 backdrop-blur-md md:p-10">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover opacity-35"
                >
                  <source src="/videos/for.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-[#080811]/65" />

                <div className="relative z-10 mx-auto max-w-2xl">
                  <h3 className="text-3xl font-black text-purple-200">
                    {t.helpTitle}
                  </h3>
                  <p className="mt-3 leading-7 text-white/80">
                    {t.helpDescription}
                  </p>

                  {!loggedIn && (
                    <p className="mt-5 rounded-xl bg-yellow-500/10 p-4 text-sm text-yellow-200">
                      {t.loginFirst}
                    </p>
                  )}

                  <div className="mt-8 space-y-5">
                    <label className="block text-sm font-bold">
                      {t.subject}
                      <input
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        maxLength={120}
                        className="mt-2 w-full rounded-xl border border-white/20 bg-black/70 px-4 py-4 font-normal outline-none focus:border-purple-400"
                      />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-bold">Kategoria zgłoszenia
                        <select value={ticketCategory} onChange={(e) => setTicketCategory(e.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-black/70 px-4 py-4 font-normal text-white">
                          <option value="account">Konto / profil</option><option value="payment">Płatność / zamówienie</option><option value="access">Dostęp TrapMaster</option><option value="bug">Błąd strony</option><option value="other">Inne</option>
                        </select>
                      </label>
                      <label className="block text-sm font-bold">Priorytet
                        <select value={ticketPriority} onChange={(e) => setTicketPriority(e.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-black/70 px-4 py-4 font-normal text-white">
                          <option value="low">Niski</option><option value="normal">Normalny</option><option value="high">Wysoki</option>
                        </select>
                      </label>
                    </div>
                    <label className="block text-sm font-bold">Numer zamówienia (opcjonalnie)
                      <input value={ticketOrder} onChange={(e) => setTicketOrder(e.target.value)} maxLength={80} placeholder="Wklej numer zamówienia, jeśli dotyczy" className="mt-2 w-full rounded-xl border border-white/20 bg-black/70 px-4 py-4 font-normal outline-none focus:border-purple-400" />
                    </label>
                    <label className="block text-sm font-bold">
                      {t.message}
                      <textarea
                        value={ticketContent}
                        onChange={(e) => setTicketContent(e.target.value)}
                        maxLength={3000}
                        rows={6}
                        placeholder={t.messagePlaceholder}
                        className="mt-2 w-full rounded-xl border border-white/20 bg-black/70 px-4 py-4 font-normal outline-none focus:border-purple-400"
                      />
                    </label>

                    {ticketMessage && (
                      <p className="text-sm text-purple-200">{ticketMessage}</p>
                    )}

                    <button
                      onClick={submitTicket}
                      disabled={ticketSending || !loggedIn}
                      className="w-full rounded-xl bg-purple-600 py-4 font-black hover:bg-purple-500 disabled:opacity-50"
                    >
                      {ticketSending ? t.sending : t.send}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* REKRUTACJA */}
            {activeTab === "recruitment" && (
              <div className="relative overflow-hidden rounded-3xl border border-purple-400/30 bg-black/75 p-6 backdrop-blur-md md:p-10">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover opacity-35"
                >
                  <source src="/videos/for.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-[#080811]/70" />

                <div className="relative z-10 mx-auto max-w-2xl">
                  <h3 className="text-3xl font-black text-purple-200">
                    {t.recruitmentTitle}
                  </h3>
                  <p className="mt-3 leading-7 text-white/80">
                    {t.recruitmentDescription}
                  </p>

                  {!loggedIn && (
                    <p className="mt-5 rounded-xl bg-yellow-500/10 p-4 text-sm text-yellow-200">
                      {t.loginFirst}
                    </p>
                  )}

                  <div className="mt-8 space-y-5">
                    <label className="block text-sm font-bold">
                      Czy lubisz zenciaka?
                      <select required value={likesZenciaka === null ? "" : likesZenciaka ? "yes" : "no"} onChange={(e) => setLikesZenciaka(e.target.value === "" ? null : e.target.value === "yes")} className="mt-2 w-full rounded-xl border border-white/20 bg-black/70 px-4 py-4 font-normal">
                        <option value="" disabled>Wybierz odpowiedź</option><option value="yes">Tak</option><option value="no">Nie</option>
                      </select>
                    </label>
                    <label className="block text-sm font-bold">
                      Ile masz lat?
                      <input type="number" min={13} max={99} value={applicantAge} onChange={(e) => setApplicantAge(e.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-black/70 px-4 py-4 font-normal" />
                    </label>
                    <label className="block text-sm font-bold">
                      Jak masz na imię?
                      <input value={applicantFirstName} onChange={(e) => setApplicantFirstName(e.target.value)} maxLength={60} className="mt-2 w-full rounded-xl border border-white/20 bg-black/70 px-4 py-4 font-normal" />
                    </label>
                    <label className="block text-sm font-bold">
                      {t.nick}
                      <input value={applicationNick} onChange={(e) => setApplicationNick(e.target.value)} maxLength={32} className="mt-2 w-full rounded-xl border border-white/20 bg-black/70 px-4 py-4 font-normal outline-none focus:border-purple-400" />
                    </label>
                    <label className="block text-sm font-bold">
                      Czy masz doświadczenie?
                      <textarea value={applicationExperience} onChange={(e) => setApplicationExperience(e.target.value)} minLength={10} maxLength={2000} rows={3} placeholder="Opisz swoje doświadczenie..." className="mt-2 w-full rounded-xl border border-white/20 bg-black/70 px-4 py-4 font-normal outline-none focus:border-purple-400" />
                    </label>
                    <label className="block text-sm font-bold">
                      Opowiedz coś o sobie (minimum 5 zdań).
                      <textarea value={applicantAbout} onChange={(e) => setApplicantAbout(e.target.value)} minLength={100} maxLength={2000} rows={5} placeholder="Napisz minimum pięć zdań o sobie..." className="mt-2 w-full rounded-xl border border-white/20 bg-black/70 px-4 py-4 font-normal outline-none focus:border-purple-400" />
                    </label>
                    <label className="block text-sm font-bold">
                      Dlaczego chcesz dołączyć?
                      <textarea value={applicationMotivation} onChange={(e) => setApplicationMotivation(e.target.value)} minLength={10} maxLength={2000} rows={3} placeholder="Napisz, dlaczego chcesz dołączyć..." className="mt-2 w-full rounded-xl border border-white/20 bg-black/70 px-4 py-4 font-normal outline-none focus:border-purple-400" />
                    </label>

                    {applicationMessage && (
                      <p className="text-sm text-purple-200">
                        {applicationMessage}
                      </p>
                    )}

                    <button
                      onClick={submitApplication}
                      disabled={applicationSending || !loggedIn}
                      className="w-full rounded-xl bg-purple-600 py-4 font-black hover:bg-purple-500 disabled:opacity-50"
                    >
                      {applicationSending ? t.sending : t.sendApplication}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TRAP CREATORS */}
            {activeTab === "creators" && (
              <div className="overflow-hidden rounded-3xl border border-purple-400/30 bg-black/70 p-6 backdrop-blur-md md:p-10">
                <div className="text-center">
                  <h3 className="text-3xl font-black text-purple-200">
                    {t.creatorsTitle}
                  </h3>
                  <p className="mt-3 text-white/60">{t.creatorsFuture}</p>
                </div>

                <div className="mt-10 overflow-hidden">
                  <div className="creator-track flex gap-6">
                    {[0, 1].map((copy) => (
                      <div
                        key={copy}
                        className="flex w-[280px] flex-shrink-0 items-center gap-5 rounded-2xl border border-purple-400/30 bg-[#11111c] p-6"
                      >
                        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-purple-400/40 bg-purple-950 text-4xl">
                          <span>🧑‍💻</span>
                        </div>
                        <div>
                          <h4 className="font-black text-purple-200">
                            MrCapybaraMc
                          </h4>
                          <p className="mt-1 text-sm text-white/65">{t.founder}</p>
                          <a
                            href="https://www.youtube.com/@MrCapybara-s"
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-block text-xs font-bold text-red-400 hover:text-red-300"
                          >
                            YouTube
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ADMIN: ZGĹOSZENIA */}
            {activeTab === "support-admin" && (
              <div className="rounded-3xl border border-cyan-400/30 bg-black/75 p-6 backdrop-blur-md md:p-10">
                <h3 className="text-3xl font-black text-cyan-200">
                  {t.adminPanel} — {t.supportAdmin}
                </h3>

                {adminLoading ? (
                  <p className="mt-6 text-white/60">{t.loading}</p>
                ) : tickets.length === 0 ? (
                  <p className="mt-6 text-white/60">{t.noTickets}</p>
                ) : (
                  <div className="mt-8 space-y-5">
                    {tickets.map((ticket) => (
                      <article
                        key={ticket.id}
                        className="rounded-2xl border border-white/15 bg-[#11111c] p-5"
                      >
                        <div className="flex flex-wrap justify-between gap-3">
                          <h4 className="text-lg font-bold text-cyan-200">
                            {ticket.subject}
                          </h4>
                          <span className="text-xs text-white/50">
                            {formatDate(ticket.created_at, language)}
                          </span>
                        </div>
                        <p className="mt-3 break-all text-xs text-white/50">
                          {t.sender}: {ticket.user_id}
                        </p>
                        <p className="mt-4 whitespace-pre-wrap leading-7 text-white/85">
                          {ticket.message}
                        </p>
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <span className="text-sm text-white/60">
                            {t.status}: {ticket.status}
                          </span>
                          <button
                            onClick={() => updateTicketStatus(ticket.id, "in_progress")}
                            className="rounded-lg border border-yellow-400/30 px-3 py-2 text-xs text-yellow-200"
                          >
                            {t.progress}
                          </button>
                          <button
                            onClick={() => updateTicketStatus(ticket.id, "closed")}
                            className="rounded-lg border border-green-400/30 px-3 py-2 text-xs text-green-200"
                          >
                            {t.closed}
                          </button>
                          <button
                            onClick={() => updateTicketStatus(ticket.id, "open")}
                            className="rounded-lg border border-white/20 px-3 py-2 text-xs text-white/70"
                          >
                            {t.open}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {adminMessage && <p className="mt-5 text-sm text-cyan-200">{adminMessage}</p>}
              </div>
            )}

            {/* ADMIN: REKRUTACJA */}
            {activeTab === "recruitment-admin" && (
              <div className="rounded-3xl border border-yellow-400/30 bg-black/75 p-6 backdrop-blur-md md:p-10">
                <h3 className="text-3xl font-black text-yellow-200">
                  {t.adminPanel} — {t.recruitmentAdmin}
                </h3>

                {adminLoading ? (
                  <p className="mt-6 text-white/60">{t.loading}</p>
                ) : applications.length === 0 ? (
                  <p className="mt-6 text-white/60">{t.noApplications}</p>
                ) : (
                  <div className="mt-8 space-y-5">
                    {applications.map((application) => (
                      <article
                        key={application.id}
                        className="rounded-2xl border border-white/15 bg-[#11111c] p-5"
                      >
                        <div className="flex flex-wrap justify-between gap-3">
                          <h4 className="text-lg font-bold text-yellow-200">
                            {application.minecraft_nick}
                          </h4>
                          <span className="text-xs text-white/50">
                            {formatDate(application.created_at, language)}
                          </span>
                        </div>
                        <p className="mt-3 break-all text-xs text-white/50">
                          {t.sender}: {application.user_id}
                        </p>
                        <div className="mt-4 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
                          <p><span className="font-bold text-yellow-200">Imię:</span> {application.first_name || "—"}</p>
                          <p><span className="font-bold text-yellow-200">Wiek:</span> {application.applicant_age ?? "—"}</p>
                          <p><span className="font-bold text-yellow-200">Czy lubi zenciaka:</span> {application.likes_zenciaka ? "Tak" : application.likes_zenciaka === false ? "Nie" : "—"}</p>
                        </div>
                        {application.about && <div className="mt-5"><h5 className="font-bold">O sobie</h5><p className="mt-2 whitespace-pre-wrap leading-7 text-white/80">{application.about}</p></div>}
                        <h5 className="mt-5 font-bold">{t.experience}</h5>
                        <p className="mt-2 whitespace-pre-wrap leading-7 text-white/80">{application.experience}</p>
                        <h5 className="mt-5 font-bold">{t.motivation}</h5>
                        <p className="mt-2 whitespace-pre-wrap leading-7 text-white/80">
                          {application.motivation}
                        </p>
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <span className="text-sm text-white/60">
                            {t.status}: {application.status}
                          </span>
                          <button
                            onClick={() => updateApplicationStatus(application.id, "accepted")}
                            className="rounded-lg border border-green-400/30 px-3 py-2 text-xs text-green-200"
                          >
                            {t.accepted}
                          </button>
                          <button
                            onClick={() => updateApplicationStatus(application.id, "rejected")}
                            className="rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-200"
                          >
                            {t.rejected}
                          </button>
                          <button
                            onClick={() => updateApplicationStatus(application.id, "pending")}
                            className="rounded-lg border border-white/20 px-3 py-2 text-xs text-white/70"
                          >
                            {t.pending}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {adminMessage && <p className="mt-5 text-sm text-yellow-200">{adminMessage}</p>}
              </div>
            )}
          </div>
        </section>

        {/* STOPKA */}
        <footer className="border-t border-white/20 bg-black/60 px-6 py-10 text-center backdrop-blur-md">
          <p className="text-xl font-black">
            TRAP<span className="text-purple-500">MASTERS</span>
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-6 text-sm text-white/70">
            <a href="/register">Konto</a>
            <a href="https://discord.gg/sJaBPzx36" target="_blank" rel="noreferrer">
              Discord
            </a>
            <a href="https://www.youtube.com/@MrCapybara-s" target="_blank" rel="noreferrer">
              YouTube
            </a>
            </div>

          <p className="mx-auto mt-6 max-w-2xl text-xs leading-6 text-white/50">
            TRAPMASTERS nie jest oficjalnie powiązany z BananaSMP.pl.
            Minecraft jest znakiem towarowym Mojang Studios.
          </p>

          <p className="mt-4 text-xs text-white/40">
            © 2026 TRAPMASTERS. {t.footer}
          </p>
        </footer>
      </div>
    </main>
  );
}

