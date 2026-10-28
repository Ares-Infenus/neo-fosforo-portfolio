# Plan de contenido

> **Nota (27-oct-2026):** este plan es el punto de partida original. Varias cifras de aquí se corrigieron tras auditar los repositorios (por ejemplo, SparkFlow se ejecutó a 100k filas, no a 100M; el 85,2 % de YOLOv8 se mide sobre las imágenes de entrenamiento). La fuente vigente del contenido es `site/src/data/profile.ts` y `site/src/content/cases/`.

## Posicionamiento
**Data Engineer** · pipelines y plataformas de datos para sistemas de machine learning.
Objetivo: vacantes junior de data engineering, remoto internacional. Hilo común: "del dato crudo a la decisión".

## Hechos verificados por el titular (usar tal cual)
Portafolio de 12 proyectos:
- SparkFlow Delta Pipeline: PySpark + Delta Lake, medallion Bronze/Silver/Gold, 100M+ transacciones, idempotencia, particionado, time travel.
- ETL Pipeline OHLCV: Binance API, resampling multi-timeframe, Parquet, validación de esquema.
- Alpha Feature Engineering: 77 features estacionarias, anti-leakage, TimeSeriesSplit, VIF.
- BTC/USDT Price Direction Predictor: XGBoost + Optuna + SHAP, walk-forward, ROC-AUC 0.5431.
- ML API productiva: FastAPI + Pydantic + Docker + CI.
- YOLOv8 object detection: 85.2 % mAP@50, exportado a ONNX.
- InsightFlow NLP: RoBERTa + spaCy + LDA, FastAPI con 8 endpoints, Streamlit.
- Markowitz Portfolio Optimizer: 4 estrategias; Sharpe 1.29.
- DistilBERT sentiment IMDB 50k: ≥ 88 % macro-F1, MLflow/DagsHub, Gradio.
- Churn Intelligence Platform: XGBoost + SHAP, AUC 0.8458, dashboard con ROI.
- Análisis econométrico AAPL: ADF/KPSS, ARCH, VaR/CVaR, implementado desde cero sin statsmodels.
- RSI Backtesting Engine: motor bar-by-bar, slippage y comisiones, Sharpe/Sortino/Calmar.
- Customer Segmentation en centros comerciales: K-means con validación multi-índice.
- HybridRecSys: recomendador BERT4Rec + SASRec.

**Cautela:** cualquier cifra de rentabilidad de backtest (por ejemplo "+320 %" en Black-Litterman) no se publica sin poder defender método, periodo y costos. Verifica cada métrica antes de que quede pública.

En curso: Omdena × HOT fAIr, proyecto GeoData Scout (ML junior, desde oct. 2026). Próximo proyecto: pipeline orquestado con Airflow + dbt + warehouse sobre datos de Binance, presupuesto cero.

## Plantilla de caso de estudio (orden)
1. TL;DR (problema, solución, resultado con enlaces a repo, demo e informe).
2. Ficha técnica (rol, duración, stack, tamaño de datos, estado).
3. Problema y contexto.
4. Objetivos y requisitos (funcionales y no funcionales).
5. Datos y procedencia (fuente, licencia, volumen, calidad, sesgos).
6. Arquitectura (diagrama + una frase por componente).
7. Decisiones y alternativas (tabla).
8. Implementación.
9. Validación.
10. Resultados (con línea base y método de medición).
11. Limitaciones conocidas y qué haría distinto.
12. Coste y rendimiento (o `SIN DATOS`).
13. Reproducibilidad (comando único, Docker, semillas).
14. Autoría y uso de IA (tabla: componente, implementado por mí, asistido por IA y revisado, automatizado, verificado cómo).
15. Próximos pasos.

## Placeholders pendientes (todos en ámbar entre corchetes)
- Home: `[TU EMAIL]`, `[PDF]` del CV.
- SparkFlow: `[PROBLEMA]`, `[ROL]`, `[DURACIÓN]`, `[ESTADO]`, `[REPO]`, `[DEMO]`, `[INFORME]`, alternativas y motivos de cada decisión, tabla de autoría, línea base, comando de reproducción, limitaciones.
- Casos 2, 3 y 4: toda la plantilla.
- Detalle por capa Bronze, Silver y Gold de SparkFlow (hoy son descripciones estándar de la arquitectura medallion, no del pipeline real).

## Mapa del sitio objetivo
`/` · `/work/` · `/work/[slug]/` · `/writing/` · `/about/` · `/cv/` · `/contact/` · `/colophon/`, todo en `/es` y `/en`.

## Notas de privacidad
No publicar teléfono. En "Sobre mí", el servicio militar puede entrar como una línea sobre disciplina y operaciones, sin datos sensibles ni operativos.
