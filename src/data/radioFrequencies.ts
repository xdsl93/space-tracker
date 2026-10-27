import { RadioFrequency } from '../types/station';

export const RADIO_FREQUENCIES: RadioFrequency[] = [
  {
    id: 'iss-voice-r1',
    stationId: 'iss',
    stationName: 'ISS (ARISS)',
    title: 'Voice Downlink & SSTV (Worldwide / Region 1)',
    titleEn: 'Voice Downlink & SSTV (Worldwide / Region 1)',
    downlinkMhz: 145.800,
    uplinkMhz: 145.200,
    mode: 'FM (NFM 25/12.5 kHz) / SSTV PD120',
    status: 'Attivo',
    statusEn: 'Active',
    region: 'Mondo (Downlink) / ITU Region 1 Europa-Africa (Uplink)',
    regionEn: 'Worldwide (Downlink) / ITU Region 1 Europe-Africa (Uplink)',
    description:
      'Frequenza principale VHF usata dal programma ARISS per contatti radio con le scuole, QSO vocali degli astronauti nel tempo libero e trasmissioni di immagini SSTV (Slow Scan TV).',
    descriptionEn:
      'Main VHF frequency used by the ARISS program for school radio contacts, astronaut casual voice QSOs, and SSTV (Slow Scan TV) image transmissions.',
    listeningTips:
      'Apri completamente lo squelch (SQL 0) durante il passaggio. Per SSTV collega l\'uscita audio a Robot36 (Android) o MMSSTV (PC) in modalità PD120.',
    listeningTipsEn:
      'Open squelch completely (SQL 0) during the pass. For SSTV, route audio to Robot36 (Android) or MMSSTV (PC) in PD120 mode.',
  },
  {
    id: 'iss-repeater-crossband',
    stationId: 'iss',
    stationName: 'ISS (ARISS)',
    title: 'Cross-Band FM Voice Repeater (V/U)',
    titleEn: 'Cross-Band FM Voice Repeater (V/U)',
    downlinkMhz: 437.800,
    uplinkMhz: 145.990,
    ctcssHz: 67.0,
    mode: 'FM Cross-Band Repeater (VHF In -> UHF Out)',
    status: 'Attivo',
    statusEn: 'Active',
    region: 'Globale',
    regionEn: 'Global',
    description:
      'Ripetitore vocale FM cross-band a bordo del modulo Columbus/Service Module. Permette ai radioamatori di effettuare QSO tra loro attraverso la ISS.',
    descriptionEn:
      'Cross-band FM voice repeater aboard the Columbus/Service Module. Allows amateur radio operators to make QSOs with each other through the ISS.',
    listeningTips:
      'In banda UHF (437.800 MHz) l\'effetto Doppler è forte (±10 kHz): inizia l\'ascolto a 437.810 MHz (AOS), scendi a 437.800 MHz al picco (TCA) e termina a 437.790 MHz (LOS).',
    listeningTipsEn:
      'In UHF band (437.800 MHz) Doppler shift is substantial (±10 kHz): start listening at 437.810 MHz (AOS), drop to 437.800 MHz at peak (TCA), and finish at 437.790 MHz (LOS).',
  },
  {
    id: 'iss-aprs-vhf',
    stationId: 'iss',
    stationName: 'ISS (ARISS)',
    title: 'APRS Packet Radio Digipeater (RS0ISS / NA1SS)',
    titleEn: 'APRS Packet Radio Digipeater (RS0ISS / NA1SS)',
    downlinkMhz: 145.825,
    uplinkMhz: 145.825,
    mode: 'AFSK 1200 bps Packet (AX.25)',
    status: 'Attivo',
    statusEn: 'Active',
    region: 'Globale (Path: ARISS)',
    regionEn: 'Global (Path: ARISS)',
    description:
      'Digipeater digitale APRS in VHF. Ritrasmette pacchetti di posizione, brevi messaggi e telemetria inviati dai radioamatori a terra.',
    descriptionEn:
      'VHF APRS digital digipeater. Retransmits position packets, short text messages, and telemetry sent by ground radio amateurs.',
    listeningTips:
      'Imposta il digipeater path su "ARISS" o "RS0ISS". Decodifica facilmente con Direwolf, Soundmodem o app mobile APRSdroid.',
    listeningTipsEn:
      'Set digipeater path to "ARISS" or "RS0ISS". Easily decode with Direwolf, Soundmodem, or the APRSdroid mobile app.',
  },
  {
    id: 'iss-voice-r23',
    stationId: 'iss',
    stationName: 'ISS (ARISS)',
    title: 'Voice Uplink ITU Region 2 & 3 (Americhe / Asia-Oceania)',
    titleEn: 'Voice Uplink ITU Region 2 & 3 (Americas / Asia-Oceania)',
    downlinkMhz: 145.800,
    uplinkMhz: 144.490,
    mode: 'FM (NFM)',
    status: 'Periodico / Eventi',
    statusEn: 'Periodic / Events',
    region: 'ITU Region 2 & 3 (Uplink) / Mondo (Downlink)',
    regionEn: 'ITU Region 2 & 3 (Uplink) / Worldwide (Downlink)',
    description:
      'Canale di uplink vocale utilizzato per contatti diretti con l\'equipaggio (Callsign NA1SS / RS0ISS / OR4ISS) nelle regioni 2 e 3.',
    descriptionEn:
      'Voice uplink channel used for direct crew contacts (callsigns NA1SS / RS0ISS / OR4ISS) in ITU Regions 2 and 3.',
    listeningTips:
      'L\'ascolto avviene sempre su 145.800 MHz FM. Un\'antenna portatile Yagi 2m/70cm o una semplice antenna bibanda 1/4 d\'onda all\'aperto consente un\'ottima ricezione.',
    listeningTipsEn:
      'Listening is always on 145.800 MHz FM. A portable 2m/70cm Yagi or a simple outdoor 1/4-wave dual-band whip provides great reception.',
  },
  {
    id: 'iss-soyuz-vhf',
    stationId: 'iss',
    stationName: 'ISS (Roscosmos)',
    title: 'Soyuz / Progress Docking & EVA VHF1 Channel',
    titleEn: 'Soyuz / Progress Docking & EVA VHF1 Channel',
    downlinkMhz: 121.750,
    mode: 'FM (Narrow)',
    status: 'Periodico / Eventi',
    statusEn: 'Periodic / Events',
    region: 'Sorvolo Russia / Europa Orientale',
    regionEn: 'Overflight Russia / Eastern Europe',
    description:
      'Canale VHF fonia utilizzato storicamente durante le manovre di docking Soyuz/Progress e comunicazioni con il TsUP (Centro di Controllo Missione di Korolev).',
    descriptionEn:
      'Voice VHF channel historically used during Soyuz/Progress docking maneuvers and communications with TsUP (Korolev Mission Control Center).',
    listeningTips:
      'Attivo principalmente quando la stazione sorvola l\'Eurasia e le stazioni di terra russe sono in visibilità.',
    listeningTipsEn:
      'Active primarily when the station is passing over Eurasia and Russian ground stations are in sight.',
  },
  {
    id: 'tiangong-amateur',
    stationId: 'tiangong',
    stationName: 'Tiangong (CSS)',
    title: 'CSS Amateur Radio Payload / Cross-Band & Voice',
    titleEn: 'CSS Amateur Radio Payload / Cross-Band & Voice',
    downlinkMhz: 436.510,
    uplinkMhz: 145.850,
    ctcssHz: 67.0,
    mode: 'FM / Digital Telemetry',
    status: 'Periodico / Eventi',
    statusEn: 'Periodic / Events',
    region: 'Globale / Eventi didattici CMSA',
    regionEn: 'Global / CMSA Educational Events',
    description:
      'Frequenze associate ai payload radioamatoriali ed esperimenti educativi ("Tiangong Classroom") della Stazione Spaziale Cinese.',
    descriptionEn:
      'Frequencies associated with amateur radio payloads and educational experiments ("Tiangong Classroom") on the Chinese Space Station.',
    listeningTips:
      'Attivato durante eventi speciali di divulgazione con studenti e test radioamatoriali coordinati da CRAC/CMSA.',
    listeningTipsEn:
      'Activated during special student outreach events and amateur radio tests coordinated by CRAC/CMSA.',
  },
  {
    id: 'tiangong-sband-ref',
    stationId: 'tiangong',
    stationName: 'Tiangong (CSS)',
    title: 'S-Band Telemetry & Tracking Beacon (Riferimento)',
    titleEn: 'S-Band Telemetry & Tracking Beacon (Reference)',
    downlinkMhz: 2219.200,
    mode: 'S-Band PCM/PSK Telemetry',
    status: 'Telemetria',
    statusEn: 'Telemetry',
    region: 'Globale (Tracking spaziale S-Band)',
    regionEn: 'Global (S-Band Space Tracking)',
    description:
      'Canale in banda S utilizzato per il downlink di telemetria orbitale e comunicazioni con la rete di tracciamento terrestre e satelliti relay Tianlian.',
    descriptionEn:
      'S-band channel used for orbital telemetry downlink and communications with ground tracking networks and Tianlian relay satellites.',
    listeningTips:
      'Richiede ricevitore SDR con parabola/antenna elicoidale per banda S (2.2 GHz) e LNA a basso rumore.',
    listeningTipsEn:
      'Requires an SDR receiver with an S-band (2.2 GHz) dish or helical antenna and a low-noise amplifier (LNA).',
  },
];
