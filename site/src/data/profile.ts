// Datos del perfil (fuente: LinkedIn, auditado el 26-oct-2026 contra los repositorios de GitHub).
// Regla de honestidad: toda cifra debe poder comprobarse en el repo enlazado.
// Fuera a propósito: cifras de Imperio del Plástico sin evidencia, puntaje de Duolingo,
// detalles operativos del servicio militar y el proyecto Customer Segmentation.
import type { Lang } from '../i18n/ui';

type L = Record<Lang, string>;
const gh = (repo: string) => `https://github.com/Ares-Infenus/${repo}`;

export interface Project {
  name: string;
  date: L;
  line: L;
  fact: L;
  /** Advertencia que acompaña a la cifra (sesgo, métrica optimista…). */
  caveat?: L;
  stack: string[];
  repo: string;
  demo?: string;
  tests: number;
  ci: boolean;
  docker: boolean;
}

export const otherProjects: Project[] = [
  {
    name: 'Penguin Species API',
    date: { es: 'mar. 2026', en: 'Mar 2026' },
    line: {
      es: 'Servicio MLOps mínimo: clasificador de scikit-learn expuesto como API REST y desplegado en Render.',
      en: 'Minimal MLOps service: a scikit-learn classifier served as a REST API and deployed on Render.',
    },
    fact: { es: 'Demo en vivo · tests de regresión con dataset dorado', en: 'Live demo · golden-dataset regression tests' },
    caveat: { es: 'Dataset simple a propósito: el foco es el despliegue, no el modelo. La demo tarda ~1 min en arrancar (plan gratuito).', en: 'Intentionally simple dataset: the focus is deployment, not the model. The demo takes ~1 min to cold-start (free tier).' },
    stack: ['FastAPI', 'scikit-learn', 'Pydantic', 'Docker', 'Render'],
    repo: gh('penguin-ml-api'), demo: 'https://penguin-ml-api-bmrr.onrender.com/docs', tests: 27, ci: true, docker: true,
  },
  {
    name: 'Markowitz Portfolio Optimizer',
    date: { es: 'mar. 2026', en: 'Mar 2026' },
    line: {
      es: 'Optimización y backtest de 4 estrategias (media-varianza, risk parity, CVaR, Black-Litterman) frente a pesos iguales.',
      en: 'Optimization and backtest of 4 strategies (mean-variance, risk parity, CVaR, Black-Litterman) against equal weight.',
    },
    fact: { es: 'Black-Litterman: Sharpe 1,29 vs 0,91 de pesos iguales', en: 'Black-Litterman: Sharpe 1.29 vs 0.91 for equal weight' },
    caveat: { es: 'Los 10 activos se eligieron a posteriori: el resultado tiene sesgo de selección y no es un pronóstico.', en: 'The 10 tickers were chosen in hindsight: the result carries selection bias and is not a forecast.' },
    stack: ['pandas', 'SciPy', 'scikit-learn', 'yfinance', 'Streamlit', 'Docker'],
    repo: gh('markowitz-portfolio-optimizer'), tests: 31, ci: true, docker: true,
  },
  {
    name: 'Star Sentiment NLP',
    date: { es: 'mar. 2026', en: 'Mar 2026' },
    line: {
      es: 'Sentimiento en 5 clases y 3 dominios: SVM y XGBoost sobre TF-IDF frente a DistilBERT ajustado.',
      en: '5-class sentiment across 3 domains: SVM and XGBoost on TF-IDF vs fine-tuned DistilBERT.',
    },
    fact: { es: 'DistilBERT 0,607 macro-F1 vs 0,522 SVM, a ~124 ms vs 0,2 ms por texto', en: 'DistilBERT 0.607 macro-F1 vs 0.522 SVM, at ~124 ms vs 0.2 ms per text' },
    stack: ['scikit-learn', 'XGBoost', 'Transformers', 'Gradio'],
    repo: gh('star-sentiment-nlp'), tests: 63, ci: true, docker: false,
  },
  {
    name: 'RSI Backtesting Engine',
    date: { es: 'feb. 2026', en: 'Feb 2026' },
    line: {
      es: 'Motor de backtest barra a barra con RSI de Wilder desde cero, comisiones y slippage, sobre BTC-USD diario (2020–2024).',
      en: 'Bar-by-bar backtester with Wilder RSI from scratch, commission and slippage, on daily BTC-USD (2020–2024).',
    },
    fact: { es: 'Procesa una barra a la vez para evitar el sesgo de anticipación', en: 'Processes one bar at a time to avoid look-ahead bias' },
    caveat: { es: 'Solo largo, capital completo por operación, sin dimensionamiento de posición.', en: 'Long-only, full capital per trade, no position sizing.' },
    stack: ['Python 3.12', 'pandas', 'NumPy', 'yfinance'],
    repo: gh('rsi-backtesting-engine'), tests: 38, ci: false, docker: false,
  },
  {
    name: 'Churn Prediction · XGBoost + SHAP',
    date: { es: 'feb. 2026', en: 'Feb 2026' },
    line: {
      es: 'Modelo de abandono sobre IBM Telco (7.043 clientes) con explicación por cliente y calculadora de ROI de retención.',
      en: 'Churn model on IBM Telco (7,043 customers) with per-customer explanations and a retention ROI calculator.',
    },
    fact: { es: 'AUC-ROC 0,846 · recall 0,77 en hold-out del 20 %', en: 'AUC-ROC 0.846 · recall 0.77 on a 20% hold-out' },
    caveat: { es: 'Cifras optimistas: el umbral y el early stopping usaron ese mismo hold-out.', en: 'Optimistic figures: threshold and early stopping used that same hold-out.' },
    stack: ['scikit-learn', 'XGBoost', 'SHAP', 'Streamlit'],
    repo: gh('business-predictive-analytics'), tests: 0, ci: false, docker: false,
  },
  {
    name: 'YOLOv8 Detection Pipeline',
    date: { es: 'mar. 2026', en: 'Mar 2026' },
    line: {
      es: 'Pipeline reproducible de visión por computadora en infraestructura gratuita: entrenamiento, evaluación, exportación a ONNX y benchmark.',
      en: 'Reproducible computer-vision pipeline on free infrastructure: training, evaluation, ONNX export and benchmark.',
    },
    fact: { es: '126 FPS (7,9 ms por imagen a 640×640 en una T4)', en: '126 FPS (7.9 ms per image at 640×640 on a T4)' },
    caveat: { es: 'COCO128 usa las mismas imágenes para entrenar y validar: demuestra el pipeline, no la generalización.', en: 'COCO128 uses the same images for training and validation: it shows the pipeline, not generalization.' },
    stack: ['PyTorch', 'YOLOv8', 'OpenCV', 'ONNX'],
    repo: gh('yolov8-object-detection-pipeline'), tests: 10, ci: true, docker: false,
  },
  {
    name: 'Crypto OHLCV ETL (Binance)',
    date: { es: 'feb. 2026', en: 'Feb 2026' },
    line: {
      es: 'ETL modular: extrae velas de la API de Binance, valida, remuestrea a 5 min y 1 h y escribe capas en Parquet con reporte de calidad.',
      en: 'Modular ETL: extracts Binance candles, validates, resamples to 5m and 1h, and writes Parquet layers with a data-quality report.',
    },
    fact: { es: 'Base de ingesta que reutilizan proyectos posteriores', en: 'Ingestion pattern reused by later projects' },
    caveat: { es: 'Script y notebook funcionales; aún sin tests automatizados.', en: 'Working script and notebook; no automated tests yet.' },
    stack: ['pandas', 'NumPy', 'PyArrow'],
    repo: gh('etl-finance-ohlcv'), tests: 0, ci: false, docker: false,
  },
  {
    name: 'AAPL Time Series Econometrics',
    date: { es: 'feb. 2026', en: 'Feb 2026' },
    line: {
      es: 'Análisis econométrico de AAPL (2019–2024) con las pruebas implementadas en NumPy/SciPy en lugar de statsmodels.',
      en: 'Econometric analysis of AAPL (2019–2024) with the tests implemented in NumPy/SciPy instead of statsmodels.',
    },
    fact: { es: 'Curtosis en exceso 7,63 · VaR diario al 5 %: −3,26 %', en: 'Excess kurtosis 7.63 · 5% daily VaR: −3.26%' },
    stack: ['NumPy', 'SciPy', 'pandas', 'Jupyter'],
    repo: gh('apple-time-series-analysis'), tests: 0, ci: false, docker: false,
  },
];

export interface Role { when: L; org: string | L; title: L; text: L }

export const experience: Role[] = [
  {
    when: { es: 'oct. 2026 — hoy', en: 'Oct 2026 — now' },
    org: 'Omdena × HOT fAIr',
    title: { es: 'Colaborador junior de ML · voluntario, remoto', en: 'Junior ML collaborator · volunteer, remote' },
    text: {
      es: 'Proyecto GeoData Scout: investigación y preparación de datasets geoespaciales para modelos base de IA del Humanitarian OpenStreetMap Team.',
      en: 'GeoData Scout project: researching and preparing geospatial datasets for the Humanitarian OpenStreetMap Team’s AI base models.',
    },
  },
  {
    when: { es: 'ago. 2025 — hoy', en: 'Aug 2025 — now' },
    org: 'Ejército Nacional de Colombia',
    title: { es: 'Auxiliar administrativo y de operaciones · servicio militar', en: 'Administrative and operations assistant · military service' },
    text: {
      es: 'Documentación oficial y abastecimiento de los pelotones; redacción y control documental de informes. Apoyo administrativo en un entorno de alta disciplina y trabajo bajo presión.',
      en: 'Official documentation and supply for platoons; drafting and records control of reports. Administrative support in a high-discipline, high-pressure environment.',
    },
  },
  {
    when: { es: 'ago. 2024 — jul. 2025', en: 'Aug 2024 — Jul 2025' },
    org: { es: 'Formación autodirigida', en: 'Self-directed training' },
    title: { es: 'Ciencia de datos, ML y MLOps', en: 'Data science, ML and MLOps' },
    text: {
      es: 'Programas de Stanford, DeepLearning.AI, Duke, IBM, Google, Johns Hopkins y University of Michigan en Python, SQL, MLOps y aprendizaje profundo.',
      en: 'Programs from Stanford, DeepLearning.AI, Duke, IBM, Google, Johns Hopkins and the University of Michigan in Python, SQL, MLOps and deep learning.',
    },
  },
  {
    when: { es: 'jun. 2023 — jun. 2024', en: 'Jun 2023 — Jun 2024' },
    org: 'Imperio del Plástico · Valledupar',
    title: { es: 'Gerente general', en: 'General manager' },
    text: {
      es: 'Dirección del negocio día a día: ventas, márgenes y resultado mensual. Proyección de ventas con tendencias y promedios móviles; Python y SQL para limpiar datos contables y de ventas. Lanzamiento de una línea de parrillas, rentable en su primer trimestre.',
      en: 'Ran the business day to day: sales, margins and monthly results. Sales forecasting with trend lines and moving averages; Python and SQL to clean accounting and sales data. Launched a grill-manufacturing line, profitable in its first quarter.',
    },
  },
];

/** Nombre de la organización según idioma (la fila de formación autodidacta lo traduce). */
export const orgName = (r: Role, lang: Lang) => (typeof r.org === 'string' ? r.org : r.org[lang]);

export const education = {
  school: 'Universidad Nacional de Colombia',
  program: { es: 'Administración de Sistemas Informáticos', en: 'Systems Administration (Computer Systems)' },
  detail: { es: '2019–2023 · siete semestres cursados; programa no terminado.', en: '2019–2023 · seven semesters completed; programme not finished.' },
  honor: { es: 'Mejor resultado en las Pruebas Saber 11 · Secretaría de Educación Municipal, 2018', en: 'Top score in the national Saber 11 exam · Municipal Education Secretariat, 2018' },
  languages: { es: 'Español nativo · Inglés básico (A2), en estudio activo con meta B2', en: 'Spanish: native · English: basic (A2), actively studying toward B2' },
};

/** Certificaciones de Coursera (programas profesionales y especializaciones). */
export const certs: { name: string; by: string; date: L }[] = [
  { name: 'Machine Learning', by: 'Stanford University', date: { es: 'feb. 2025', en: 'Feb 2025' } },
  { name: 'MLOps | Machine Learning Operations', by: 'Duke University', date: { es: 'feb. 2025', en: 'Feb 2025' } },
  { name: 'Deep Learning', by: 'DeepLearning.AI', date: { es: 'feb. 2025', en: 'Feb 2025' } },
  { name: 'TensorFlow Developer', by: 'DeepLearning.AI', date: { es: 'feb. 2025', en: 'Feb 2025' } },
  { name: 'AWS Cloud Solutions Architect', by: 'AWS · Coursera', date: { es: 'may. 2025', en: 'May 2025' } },
  { name: 'Google Data Analytics', by: 'Google', date: { es: 'feb. 2025', en: 'Feb 2025' } },
  { name: 'IBM Data Science', by: 'IBM', date: { es: 'ago. 2024', en: 'Aug 2024' } },
  { name: 'IBM Data Science Professional Certificate (V3)', by: 'IBM · Coursera', date: { es: 'ago. 2024', en: 'Aug 2024' } },
  { name: 'Applied Data Science with Python', by: 'University of Michigan', date: { es: 'ene. 2025', en: 'Jan 2025' } },
  { name: 'PostgreSQL for Everybody', by: 'University of Michigan', date: { es: 'ene. 2025', en: 'Jan 2025' } },
  { name: 'SQL for Data Science', by: 'UC Davis', date: { es: 'sept. 2024', en: 'Sep 2024' } },
  { name: 'Mathematics for Machine Learning', by: 'Imperial College London', date: { es: 'ene. 2025', en: 'Jan 2025' } },
  { name: 'Software Design and Architecture', by: 'University of Alberta', date: { es: 'ene. 2025', en: 'Jan 2025' } },
  { name: 'Data Science: Foundations using R', by: 'Johns Hopkins University', date: { es: 'ene. 2025', en: 'Jan 2025' } },
];

/** Stack demostrado en los repositorios (no solo declarado). */
export const stack = {
  data: ['Python', 'SQL', 'PostgreSQL', 'pandas', 'NumPy', 'Parquet', 'PySpark', 'Delta Lake'],
  ml: ['scikit-learn', 'XGBoost', 'SHAP', 'Optuna', 'Hugging Face'],
  eng: ['Git', 'GitHub Actions', 'Docker', 'pytest', 'FastAPI', 'Pydantic', 'Streamlit'],
};

/** Totales verificados (tabla de repos del perfil, 26-oct-2026). */
export const totals = { repos: 12, tests: 377, reposWithTests: 9, ci: 6, docker: 4, deployed: 1 };
