/**
 * T661 AI Trainer
 * Generate random T661 reports and rate them to train the AI model.
 * Paragraph-level thumbs up/down + word-level click-to-mark-bad.
 * All feedback auto-saves to the server for DPO/SFT training.
 */

// ============================================
// CONFIGURATION & STATE
// ============================================

let aiServerOnline = false;
let feedbackStore = JSON.parse(localStorage.getItem('sred_feedback') || '[]');
let badWordsStore = JSON.parse(localStorage.getItem('sred_bad_words') || '[]');
let currentGenerationId = parseInt(localStorage.getItem('sred_gen_id') || '0');

// ============================================
// UTILITIES
// ============================================

function countWords(text) {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ============================================
// RANDOM T661 PROJECT POOL (18 diverse projects)
// ============================================

const RANDOM_PROJECTS = [
    {
        title: "Real-Time Fraud Detection ML System",
        field: "software",
        personnel: "Senior Software Engineers, Machine Learning Specialists, and Data Scientists",
        objective: "development of a hybrid neural network architecture capable of processing 10,000 financial transactions per second with 99.9% fraud detection accuracy",
        baseline: "existing systems relied on rule-based engines (85-90% accuracy, high throughput) or batch ML models (98%+ accuracy, 500ms+ latency). The best documented systems achieved ~2,000 TPS at 95-97% accuracy. No system combined both high throughput and high accuracy simultaneously.",
        uncertainties: [
            "whether a neural network could maintain >99.9% accuracy when constrained to <0.1ms inference latency per transaction, given the fundamental accuracy-speed trade-off",
            "whether real-time feature extraction from raw transaction data could be performed within sub-millisecond latency using probabilistic data structures while preserving signal quality for accurate classification",
            "whether an online learning mechanism using elastic weight consolidation could adapt to new fraud patterns without catastrophic forgetting of previously learned patterns",
            "whether the system could maintain consistent throughput and accuracy under variable loads from 1,000 to 15,000 TPS"
        ],
        experiments: [
            "Benchmarked 5 neural architectures (standalone GBDT, compressed transformer, sequential pipeline, parallel ensemble, cascaded filter) on 1M synthetic transactions measuring latency, accuracy, precision, and recall",
            "Developed and tested 3 real-time feature computation approaches: pre-computed stores, streaming sliding windows, and novel probabilistic data structures (Count-Min Sketch, HyperLogLog)",
            "Implemented elastic weight consolidation with experience replay, testing across simulated emerging fraud patterns over 6 continuous runs",
            "Conducted integration load testing from 1,000-15,000 TPS with zero-copy data transfer and custom memory pool optimizations"
        ],
        results: "Achieved 12,500 TPS with 99.92% accuracy using a cascaded GBDT-transformer architecture with adaptive routing. Feature computation reduced from 12ms to 0.08ms. Online learning maintained 99.85% accuracy during adaptation. 4 major architecture iterations were required."
    },
    {
        title: "Computer Vision Micro-Defect Inspection System",
        field: "manufacturing",
        personnel: "Optical Engineers, Machine Vision Specialists, Software Developers, and Manufacturing Engineers",
        objective: "development of a multi-spectral imaging and deep learning system detecting micro-defects as small as 50 micrometers in injection-molded parts at 120 parts per minute",
        baseline: "commercial inspection systems detected defects >200μm using edge detection and template matching. Deep learning approaches reached 100μm in labs but only at 15-20 parts/minute. Human visual inspection achieved 85-90% detection for 50-200μm defects. No system combined 50μm resolution with production-line speed.",
        uncertainties: [
            "whether a multi-spectral imaging configuration could capture sufficient detail of 50μm defects on curved, textured surfaces within a 250ms imaging window per part",
            "whether a deep learning architecture could achieve 99.5% defect detection while processing inspections within 250ms on production-grade edge computing hardware",
            "whether the system could differentiate actual defects from acceptable cosmetic variations (mold texture, gate marks, parting lines) to maintain false rejection below 0.1%",
            "whether transfer learning could enable adaptation to new part geometries with fewer than 100 labeled training images"
        ],
        experiments: [
            "Evaluated 12 illumination configurations (UV 365nm, visible 520nm, NIR 850nm) across 5 part geometries, varying angle (15°-75°), wavelength, and exposure timing",
            "Compared 8 CNN architectures: standard EfficientNet-B4, pruned variants, and custom depthwise separable designs, with knowledge distillation and quantization-aware training",
            "Developed two-stage classification pipeline with contrastive learning for defect-vs-acceptable-variation discrimination across 5 iterations",
            "Tested meta-learning algorithms (MAML, Prototypical Networks) vs. fine-tuning for few-shot adaptation to new part types"
        ],
        results: "Final system detects 50μm defects at 120 parts/minute with 99.6% detection accuracy and 0.08% false rejection rate. Few-shot adaptation works with 75 labeled images. Sequential multi-angle illumination at 365nm/850nm proved optimal. 7 major architecture iterations required."
    },
    {
        title: "PFAS Membrane Filtration System",
        field: "cleantech",
        personnel: "Environmental Engineers, Materials Scientists, Chemical Engineers, and Process Engineers",
        objective: "development of a novel composite membrane incorporating functionalized nanomaterials reducing PFAS concentrations below 4 parts per trillion in municipal water while maintaining >50 GFD flow rates",
        baseline: "granular activated carbon achieved 20-40 ppt for long-chain PFAS but only 40-60% removal for short-chain variants (PFBS, GenX). Nanofiltration/RO membranes showed 90-95% rejection (50-200 ppt effluent). No membrane-based solution achieved sub-4 ppt for both long and short-chain PFAS at commercially viable flow rates.",
        uncertainties: [
            "whether functionalized nanomaterials could create selective PFAS binding sites within a membrane matrix without restricting water flux below the 50 GFD commercial viability threshold",
            "whether the membrane could achieve >99.99% rejection for short-chain PFAS variants (C4-C6) which have weaker hydrophobic interactions with standard membrane materials",
            "whether the composite membrane could maintain structural integrity and rejection performance over 24 months of continuous municipal water treatment operation with varying water chemistry",
            "whether the membrane fabrication process could be scaled from laboratory coupon testing to full-scale spiral-wound module production without degradation of nanomaterial distribution"
        ],
        experiments: [
            "Synthesized and tested 18 nanomaterial-polymer combinations varying particle size, loading density, surface functionalization chemistry, and polymer matrix composition",
            "Conducted accelerated aging studies at elevated temperature and pressure to simulate 24-month operational conditions over 3-month test periods",
            "Tested rejection performance across varying influent PFAS concentrations (100-10,000 ppt), pH (5-9), and competing ion concentrations",
            "Fabricated pilot-scale spiral-wound modules and conducted 6-month field trials at a municipal water treatment facility"
        ],
        results: "Developed a functionalized graphene oxide/PVDF composite membrane achieving 3.2 ppt effluent concentration (99.997% rejection) at 58 GFD. Short-chain PFAS rejection exceeded 99.99%. Membrane maintained performance over 18-month pilot trial. 5 formulation iterations required."
    },
    {
        title: "Enzyme Immobilization for Pharmaceutical Synthesis",
        field: "biotech",
        personnel: "Biochemists, Chemical Engineers, Materials Scientists, and Process Engineers",
        objective: "development of a novel hierarchically structured mesoporous support with site-specific enzyme conjugation enabling continuous-flow biocatalytic synthesis with >85% activity retention over 500 operational hours",
        baseline: "standard immobilization methods (covalent binding to silica, alginate entrapment, cross-linked aggregates) achieved 40-70% initial activity retention with 50-150 hour half-lives. Published maximum substrate conversion was 70-80% at industrial flow rates. Batch processing with free enzymes cost 30-40% of production in enzyme costs alone.",
        uncertainties: [
            "whether a hierarchically structured mesoporous support with both macroporous channels for mass transfer and mesoporous cavities for enzyme stabilization could maintain mechanical integrity under 5 bar continuous-flow pressure",
            "whether site-specific conjugation targeting non-essential surface residues via bio-orthogonal SPAAC chemistry could achieve >85% activity retention without distorting active site geometry",
            "whether the immobilized system could maintain stability over 500 continuous hours under combined stresses of shear, substrate inhibition, and thermal cycling",
            "whether the support-enzyme interface could maintain stability and activity in organic co-solvents (DMSO, acetonitrile) up to 30% v/v for poorly water-soluble intermediates"
        ],
        experiments: [
            "Sol-gel synthesis evaluating surfactant concentration (4 levels), polystyrene microsphere diameter (3 levels), calcination temperature (5 levels), and aging time (4 levels) — 108 formulations total",
            "Computational modeling of 8 candidate non-natural amino acid incorporation sites, followed by expression, purification, SPAAC conjugation, and activity assays",
            "Six continuous-flow runs of 100+ hours varying flow rate (0.5-5.0 mL/min), temperature (25-45°C), and substrate concentration (5-50 mM)",
            "Co-solvent titration experiments (0-40% v/v DMSO and acetonitrile) with systematic variation of hydrophobic surface modification agents"
        ],
        results: "Achieved 88% activity retention, 680-hour operational stability, >95% conversion at 12-minute residence time, and 83% activity at 30% DMSO. Key innovations: nano-silica-modified mesoporous silica, SPAAC bio-orthogonal conjugation, PEGylated surface coating, and importance-weighted online updates."
    },
    {
        title: "Low-Power Industrial IoT Sensor Node",
        field: "electronics",
        personnel: "Embedded Systems Engineers, RF Engineers, Firmware Developers, and Industrial Automation Specialists",
        objective: "development of a wireless sensor node achieving 10-year battery life from a standard lithium thionyl chloride cell with hourly data transmission over 100-500m in industrial environments",
        baseline: "existing low-power sensor nodes achieved 20-50μA average current for comparable functionality, limiting battery life to 2-4 years. Standard wireless protocols (LoRa, BLE, Zigbee) consumed 50-200 mJ per transmission. No commercial product achieved 10-year operation with the combined sensing, processing, and transmission requirements.",
        uncertainties: [
            "whether average power consumption below 5μA could be achieved while maintaining on-node data preprocessing and anomaly detection capability, representing a 4x reduction from the state of the art",
            "whether a wireless protocol could deliver sensor data reliably over 100-500m in metallic industrial environments while consuming less than 30 mJ per transmission event",
            "whether sensor calibration accuracy (±0.5°C temperature, ±2% vibration) could be maintained over 10 years without manual recalibration despite sensor drift and aging",
            "whether a hardware watchdog and self-recovery system could detect and recover from all anticipated failure modes over 10 years without human intervention"
        ],
        experiments: [
            "Power profiling of 6 ultra-low-power MCU architectures in custom firmware configurations, measuring active/sleep current across 12 duty cycle scenarios",
            "RF propagation testing of 4 modulation schemes across 3 industrial facility types, evaluating packet delivery ratio, latency, and energy per transmission",
            "Accelerated aging experiments simulating 10-year sensor drift under temperature cycling (-40°C to +85°C) and developed autonomous drift compensation algorithms",
            "Fault injection testing covering 15 failure modes (firmware crash, clock drift, memory corruption, peripheral lockup) with automated recovery verification over 1000-hour continuous runs"
        ],
        results: "Achieved 3.8μA average current (10.7-year projected life), 22 mJ per transmission at 350m range, ±0.3°C accuracy after simulated 10-year aging with autonomous recalibration. Custom watchdog achieved 99.97% autonomous recovery rate across all tested failure modes."
    },
    {
        title: "Probiotic Encapsulation for Shelf-Stable Foods",
        field: "food science",
        personnel: "Food Scientists, Microbiologists, and Process Engineers",
        objective: "development of a dual-layer encapsulation system achieving 89% gastric survival and maintaining >10^6 CFU/g probiotic viability over 12 months ambient storage in multiple food matrices",
        baseline: "standard alginate encapsulation achieved 12% gastric survival. Published approaches reached 200μm crack healing, 40-70% gastric survival for single-component capsules. No encapsulation method simultaneously achieved high gastric survival, 12-month shelf stability, and compatibility with diverse food processing conditions.",
        uncertainties: [
            "whether a dual-layer design (acid-resistant outer, humidity-protective inner) could simultaneously protect against gastric acid (pH 1.5-3.0, pepsin, 37°C) and moisture during ambient storage",
            "whether the thermal exposure during spray-drying encapsulation could be optimized to maintain probiotic viability while achieving target capsule morphology (200-400μm diameter)",
            "whether protective compounds (trehalose, sodium ascorbate) within the inner matrix could stabilize probiotic cell membranes sufficiently for 12-month viability at 25°C/60% RH",
            "whether the capsule system could survive food processing temperatures (pasteurization, baking, chocolate tempering) across different food matrices"
        ],
        experiments: [
            "Screened 15 material combinations (alginates, chitosan, whey protein, modified starches, shellac, cellulose derivatives) evaluating encapsulation efficiency, gastric survival, and moisture barrier at 25°C/60% RH",
            "Factorial optimization: inner layer (protein:starch ratio × crosslinker × emulsification speed) and outer layer (shellac concentration × alginate MW × coating method) — 108 runs total",
            "Tested 5 protective compounds at 3 concentrations with accelerated (35°C/75% RH) and real-time (25°C/60% RH) storage with monthly plate counts",
            "Evaluated encapsulated probiotics in fruit juice (pH 3.5-4.0), cereal bar (aw 0.4-0.5), and chocolate coating matrices under respective processing conditions"
        ],
        results: "Achieved 89% gastric survival with dual shellac-alginate/modified starch-whey protein capsules. 12-month viability: >10^6 CFU/g in cereal bars and chocolate. Juice matrix required additional zein protein sub-layer. Trehalose (15%) + sodium ascorbate (2%) optimal for storage stability."
    },
    {
        title: "Legal Contract NLP Extraction System",
        field: "AI/NLP",
        personnel: "NLP Research Scientists, Machine Learning Engineers, Software Developers, and Legal Domain Experts",
        objective: "development of a domain-specific language understanding system extracting structured data from Canadian legal contracts with >95% F1 across 40+ clause types, bilingual English-French processing, and cross-jurisdictional generalization",
        baseline: "commercial tools used rule-based extraction with 70-80% accuracy requiring extensive template engineering. Fine-tuned transformers (BERT, RoBERTa) achieved 85-88% F1 on US legal benchmarks but dropped 15-25% on Canadian documents. Industry standard required 60-70% automation with significant human review.",
        uncertainties: [
            "whether a transformer model could achieve >95% F1 across 40+ clause types given high lexical overlap between clause categories (e.g., limitation of liability vs. indemnification)",
            "whether a unified bilingual architecture could process English and French legal text without cross-linguistic interference degrading accuracy beyond acceptable thresholds",
            "whether cross-jurisdictional generalization (common law vs. civil code across provinces) could be achieved without province-specific model variants",
            "whether zero-shot or few-shot clause detection could work for unseen contract clause types using compositional legal language understanding with fewer than 10 examples"
        ],
        experiments: [
            "Compared 3 pre-training strategies (continued XLM-RoBERTa, scratch with legal tokenizer, hybrid) on 2.3M Canadian legal documents, evaluated on 5,000 annotated benchmark clauses",
            "Tested 5 multi-task architectures with varying parameter sharing, task weighting, and training curricula, including a novel clause-type-conditioned attention mechanism",
            "Contrastive training on 15,000 aligned bilingual clause pairs, plus adversarial jurisdiction-invariant training across ON/QC/BC/AB legal frameworks",
            "Evaluated MAML, Prototypical Networks, and prompt-based retrieval-augmented extraction for few-shot adaptation on 10 held-out clause types"
        ],
        results: "Achieved 96.1% F1 across 42 clause types, bilingual gap reduced to <2%, cross-jurisdictional variance below 2% F1, and 95.2% F1 few-shot adaptation with just 5 examples per new clause type. 6 architecture iterations for the multi-task model."
    },
    {
        title: "Composite Material Layup for Aerospace Structures",
        field: "aerospace",
        personnel: "Aerospace Engineers, Materials Scientists, Process Engineers, and Structural Analysts",
        objective: "development of a variable-stiffness automated fiber placement process for CFRP structural components achieving 25% weight reduction over aluminum with 3x fatigue life improvement over conventional composites",
        baseline: "standard AFP processes with quasi-isotropic layups achieved 15-18% weight reduction with 40,000-60,000 flight cycle fatigue life. Variable-stiffness designs showed 20-30% theoretical improvement in computational models but no manufacturing process achieved aerospace certification standards (void content <1%, tolerance ±0.1mm) for steered-fiber laminates.",
        uncertainties: [
            "whether the relationships between fiber steering radius, compaction pressure, processing temperature, and defect populations could be characterized sufficiently for reliable manufacturing of variable-stiffness laminates",
            "whether void content could be maintained below 0.8% in steered-fiber regions where fiber buckling and gap/overlap defects are most prevalent",
            "whether variable-stiffness laminates could achieve repeatable dimensional tolerances within ±0.08mm across production components despite the geometric complexity of curvilinear fiber paths",
            "whether fatigue life predictions for variable-stiffness laminates could be validated, as standard damage tolerance models assume quasi-isotropic layup configurations"
        ],
        experiments: [
            "Systematic steering radius trials (minimum 200mm to 800mm) measuring gap/overlap defects, fiber waviness, and void content via micro-CT scanning for each radius and layup speed combination",
            "Full factorial design of experiments: compaction force (4 levels), lay-up speed (3 levels), heater temperature (4 levels), and steering radius (5 levels) — 240 test coupons",
            "Fatigue testing of variable-stiffness panels under spectrum loading (FALSTAFF) to 200,000 cycles with periodic ultrasonic C-scan inspection for damage evolution",
            "Production-representative manufacturing trials on 1m x 0.5m structural panels with automated dimensional inspection and mechanical property validation"
        ],
        results: "Achieved 27% weight reduction with fatigue life exceeding 190,000 cycles. Void content maintained at 0.6% in steered regions through optimized compaction profiles. Dimensional tolerance ±0.07mm achieved. Minimum reliable steering radius determined to be 350mm at production speeds."
    },
    {
        title: "Non-Invasive Continuous Glucose Monitor",
        field: "medical devices",
        personnel: "Biomedical Engineers, Optical Engineers, Signal Processing Specialists, and Clinical Researchers",
        objective: "development of a wearable NIR spectroscopy device achieving clinical-grade glucose measurement (MARD <15% per ISO 15197) without blood sampling, in a 40mm × 12mm wearable form factor",
        baseline: "non-invasive NIR glucose sensing in published studies achieved MARD of 25-40%, well above clinical thresholds. Laboratory NIR systems achieving required sensitivity used 50-100mm optical paths with thermoelectric-cooled detectors. Existing non-invasive research required per-user calibration with 3-5 blood reference measurements. No wearable device achieved clinical-grade non-invasive glucose monitoring.",
        uncertainties: [
            "whether the glucose-specific absorption signal at 1,550-1,650nm could be separated from confounding absorption by water, hemoglobin, melanin, and subcutaneous fat, given glucose represents ~0.1% of total NIR tissue absorption",
            "whether a miniaturized sensor module within 40mm × 12mm × 25g constraints could maintain the optical path length and detector sensitivity for clinically accurate measurement",
            "whether ML algorithms could generalize glucose prediction across diverse physiological variability (skin pigmentation, fat thickness, hydration, circulation) without per-user calibration",
            "whether motion artifact compensation could maintain accuracy during daily activities (walking, typing, exercise) given the weak glucose-specific signal component"
        ],
        experiments: [
            "Optical simulation and bench testing of 24 LED/photodetector configurations varying wavelength (1,500-1,700nm, 6 bands), spacing (8 geometries), and optical path designs",
            "Custom ASIC design iterations for miniaturized lock-in amplification achieving SNR improvements of 18dB over discrete component implementations",
            "Population study with 150 participants across Fitzpatrick skin types I-VI, BMI 18-40, testing glucose prediction with population-level vs. individualized calibration models",
            "Motion artifact studies: treadmill (3-10 km/h), cycling, typing, and daily activity protocols with simultaneous reference blood glucose measurements every 15 minutes"
        ],
        results: "Achieved MARD of 12.8% in controlled conditions and 14.2% during daily activities. Population model eliminates per-user calibration for 87% of users. Custom dual-wavelength differential measurement technique key innovation. 5 ASIC iterations required."
    },
    {
        title: "Self-Healing Concrete with Microencapsulated Agents",
        field: "materials science",
        personnel: "Materials Scientists, Chemical Engineers, Civil Engineers, and Concrete Technologists",
        objective: "development of a dual-capsule self-healing concrete system autonomously repairing cracks up to 400μm, restoring >90% compressive strength and >95% impermeability while surviving standard concrete mixing",
        baseline: "autogenous healing was limited to <50μm cracks with 40-60% strength recovery. Bacterial approaches healed up to 200μm in labs but bacteria lost viability during production. Polymer single-capsule systems achieved crack sealing but <50% strength recovery. Standard practice relied on manual crack injection repair.",
        uncertainties: [
            "whether UF microcapsules containing reactive polyurethane prepolymer and amine hardener could survive concrete mixing (shear rates up to 100 s⁻¹), curing (pH 12.5-13.5, 70°C), yet rupture when intersected by a crack",
            "whether two separately encapsulated healing agents released from ruptured capsules could reliably contact and polymerize within a 100-400μm crack plane without external agitation",
            "whether polyurethane-based healing in the alkaline, moisture-laden crack environment could achieve sufficient adhesion to restore compressive strength to 90% of original",
            "whether sufficient capsule density could be incorporated without degrading uncracked concrete mechanical properties beyond acceptable limits"
        ],
        experiments: [
            "Evaluated 108 UF shell wall formulations: resin MW (3 levels) × nano-silica loading (4 levels) × shell thickness (3 levels) × core-to-shell ratio (3 levels), testing mixing survival, pH stability, and crack-triggered rupture",
            "Rheological optimization of healing agent viscosity (targeting 200-300 mPa·s for capillary penetration), cure kinetics at pH 13, and aminosilane coupling agent screening",
            "Prepared 150mm cubes and 100×100×500mm prisms at 1-8% capsule volume fractions, testing compressive strength, flexural strength, and elastic modulus at 7 and 28 days",
            "Pre-cracked specimens to 100-500μm widths, allowed 7-day healing, then re-tested for strength recovery and impermeability; 300-cycle freeze-thaw durability testing per ASTM C666"
        ],
        results: "91% strength recovery for 300μm cracks, 87% for 400μm, >96% impermeability restoration. Capsule survival 82% during mixing with 3% nano-silica modification. 4.5% volume fraction optimal (only 6% strength reduction in uncracked state). Survived 300 freeze-thaw cycles."
    },
    {
        title: "Legacy Manufacturing ERP Integration Platform",
        field: "software/industrial",
        personnel: "Senior Software Engineers, Systems Integration Specialists, and Industrial Automation Engineers",
        objective: "development of a real-time data integration platform with bidirectional communication between legacy MES systems using undocumented proprietary protocols and modern ERP, achieving <500ms data sync with zero data loss",
        baseline: "existing middleware (MuleSoft, Dell Boomi, BizTalk) supported documented APIs and standard protocols (OPC-UA, MQTT, REST). Legacy systems used proprietary serial protocols from the 1990s with no documentation or vendor support. Standard practice involved manual data entry, batch transfers with 4-24 hour latency, or costly equipment replacement.",
        uncertainties: [
            "whether proprietary serial protocols with undocumented state transitions, error correction codes, and timing-dependent handshakes could be reverse-engineered to sufficient completeness for reliable bidirectional communication",
            "whether protocol translation could achieve <500ms end-to-end latency given RS-485 serial links at 9600 baud with fixed polling intervals and required translation overhead",
            "whether data integrity could be guaranteed with application-layer transactions over legacy links with 10⁻⁴ bit error rates and no built-in transactional semantics, without modifying legacy firmware",
            "whether semantic data mapping between legacy fixed-point integers and IEEE 754 floats could maintain precision within ±0.001mm over continuous bidirectional conversion cycles"
        ],
        experiments: [
            "Passive capture of 500+ hours of serial traffic across 8 operational scenarios, statistical byte pattern analysis, state machine inference, and active protocol probing with systematically varied parameters",
            "Benchmarked 3 translation architectures (synchronous request-response, async message queue, hybrid priority-based routing) measuring latency, message ordering, and resource utilization",
            "Designed idempotent messages with sequence numbering and timeout-based retransmission, verified over 10,000-hour continuous operation",
            "Systematic numeric conversion testing across full measurement range (0.001-9999.999mm) with integer-based intermediate representations, verifying precision over 1M bidirectional cycles"
        ],
        results: "Reverse-engineered 3 legacy protocols (47 message types, 12 state transitions, proprietary CRC-16 variant). Achieved 380ms average latency with hybrid architecture. Zero data loss over 10,000 hours. Precision maintained at ±0.0001mm. 4 optimization iterations for serial port drivers."
    },
    {
        title: "Autonomous Drone Navigation in GPS-Denied Environments",
        field: "robotics/aerospace",
        personnel: "Robotics Engineers, Computer Vision Researchers, Control Systems Engineers, and Sensor Integration Specialists",
        objective: "development of a visual-inertial SLAM system enabling autonomous drone navigation in GPS-denied indoor industrial environments with <5cm positional accuracy at 10Hz update rate",
        baseline: "existing visual SLAM systems (ORB-SLAM3, LSD-SLAM) achieved 1-2% trajectory error in well-lit structured environments but degraded to 10-20% error in industrial settings with repetitive textures, dynamic lighting, and airborne particulates. Standard IMU-aided navigation accumulated 0.1% drift per second. No documented system achieved <5cm accuracy in feature-poor industrial environments.",
        uncertainties: [
            "whether visual features could be reliably extracted and tracked in industrial environments with repetitive structural elements, low-contrast surfaces, and variable lighting conditions typical of warehouses and factories",
            "whether a tightly-coupled visual-inertial fusion architecture could maintain <5cm accuracy during aggressive maneuvers (3g acceleration, 180°/s rotation) where motion blur degrades visual tracking",
            "whether the system could dynamically detect and adapt to environmental changes (moved inventory, personnel, changed lighting) without requiring re-mapping",
            "whether the computational load of real-time SLAM, obstacle detection, and path planning could be supported within the 150g payload and 15W power constraints of the target drone platform"
        ],
        experiments: [
            "Evaluated 6 feature detection algorithms (ORB, SIFT, SuperPoint, R2D2, ALIKE, custom learned features) across 4 industrial environment types measuring repeatability, matching accuracy, and compute requirements",
            "Tested 4 visual-inertial fusion strategies (loosely-coupled, tightly-coupled, semi-direct, direct) under motion profiles from hover to aggressive flight, measuring pose error against ground truth from Vicon motion capture",
            "Developed and evaluated 3 dynamic environment handling approaches: semantic masking, change detection with map updates, and multi-session map merging with consistency validation",
            "Profiled computational load on 4 embedded platforms (Jetson Nano, Xavier NX, Orin Nano, RPi CM4) with architecture-specific optimizations including INT8 quantization and CUDA acceleration"
        ],
        results: "Achieved 3.2cm mean positional accuracy at 15Hz on Jetson Xavier NX. Custom learned feature detector achieved 94% repeatability in industrial environments vs. 47% for ORB. Tightly-coupled VIO with learned features key to accuracy under motion. Dynamic map updates maintained accuracy during 85% of environmental changes."
    },
    {
        title: "High-Throughput Biodegradable Plastic Formulation",
        field: "materials/cleantech",
        personnel: "Polymer Scientists, Chemical Engineers, Environmental Scientists, and Process Engineers",
        objective: "development of a PLA-PBAT-starch ternary blend achieving mechanical properties equivalent to LDPE (tensile strength >15 MPa, elongation >300%) with complete marine biodegradation within 180 days",
        baseline: "commercial biodegradable plastics (PLA, PBAT, PHA) individually failed to match LDPE performance: PLA was brittle (elongation <10%), PBAT had low modulus, and PHA was expensive. Binary PLA-PBAT blends reached 200% elongation but lacked marine biodegradability. No formulation simultaneously achieved LDPE-equivalent mechanics and marine biodegradation within 6 months.",
        uncertainties: [
            "whether the immiscible PLA-PBAT interface could be compatibilized to achieve a co-continuous morphology providing both the stiffness of PLA and the flexibility of PBAT simultaneously",
            "whether thermoplastic starch could be uniformly dispersed as a biodegradation-accelerating phase without creating stress concentration sites that degrade tensile properties below target values",
            "whether a reactive compatibilization approach during melt processing could create sufficient interfacial adhesion to maintain mechanical integrity during marine biodegradation",
            "whether the ternary blend could be processed on standard blown film extrusion equipment at commercial production rates without thermal degradation of the starch component"
        ],
        experiments: [
            "Melt blending of PLA-PBAT at 7 composition ratios (10/90 to 70/30) with 4 reactive compatibilizers, characterizing morphology by SEM, mechanical properties by ASTM D638, and thermal stability by TGA/DSC",
            "Starch plasticization trials with 5 plasticizer systems and 3 loading levels, evaluating dispersion quality by micro-CT, water absorption kinetics, and impact on tensile properties",
            "Marine biodegradation testing per ASTM D7991 in natural seawater at 3 temperatures, with bi-weekly mass loss, molecular weight, and CO2 evolution measurements over 6-month exposure",
            "Blown film extrusion trials on commercial equipment at 5 temperature profiles and 3 screw speeds, measuring film uniformity, mechanical properties, and starch degradation by color change and molecular weight analysis"
        ],
        results: "Achieved tensile strength 17.2 MPa, elongation 340%, and 89% marine biodegradation at 180 days using PLA/PBAT/TPS 30/50/20 with epoxy-functionalized reactive compatibilizer at 3 phr. Processable on standard equipment at optimized 165°C profile. 6 formulation iterations."
    },
    {
        title: "Real-Time Speech Translation for Clinical Settings",
        field: "AI/speech processing",
        personnel: "Speech Recognition Engineers, NLP Scientists, Medical Informatics Specialists, and Clinical Validation Researchers",
        objective: "development of an on-device speech-to-speech translation system for clinical patient interviews supporting 8 language pairs with medical terminology accuracy >98% and latency <2 seconds on mobile hardware",
        baseline: "cloud-based translation services (Google, Azure, AWS) achieved 85-90% general accuracy but dropped to 70-75% for medical terminology. Latency was 3-8 seconds depending on connectivity. No on-device solution existed for medical speech translation. Privacy regulations (HIPAA, PIPEDA) prohibited sending patient health information to cloud services.",
        uncertainties: [
            "whether a compact multilingual ASR model (<500MB) could achieve medical terminology recognition accuracy >98% across 9 languages when deployed on mobile hardware with limited computational resources",
            "whether machine translation models could reliably translate medical concepts (symptoms, diagnoses, medication names, dosing instructions) that have no direct lexical equivalents across certain language pairs",
            "whether end-to-end latency could be reduced below 2 seconds for the complete ASR→NMT→TTS pipeline running entirely on-device without cloud connectivity",
            "whether the system could handle code-switching (patients mixing two languages mid-sentence) which occurs in 30-40% of clinical conversations with multilingual patients"
        ],
        experiments: [
            "Distilled a 2.3B parameter multilingual ASR model into 5 candidate compact architectures (150-450MB), evaluated on 12,000 medical consultation recordings across 9 languages",
            "Developed medical-domain NMT with terminology-constrained decoding, evaluating 4 constrained beam search variants against a medical phrase database of 85,000 terms across 8 language pairs",
            "Pipeline latency optimization: quantization (INT8, INT4), speculative decoding, and streaming ASR with partial hypothesis translation — measured on 5 mobile processors (Snapdragon, Apple A-series, Mediatek)",
            "Code-switching experiments with a language-identification-augmented ASR architecture, tested on 2,000 simulated and 500 real clinical conversations with ground-truth transcriptions"
        ],
        results: "Achieved 98.3% medical term accuracy for 6/8 language pairs (96.1% for the remaining 2). On-device latency 1.7 seconds on Snapdragon 8 Gen 2. Code-switching handled with 94% accuracy. Model size 380MB. 4 distillation iterations for ASR, 3 for NMT."
    },
    {
        title: "Additive Manufacturing of Titanium Lattice Implants",
        field: "medical/manufacturing",
        personnel: "Biomechanical Engineers, Materials Scientists, Additive Manufacturing Specialists, and Orthopedic Surgeons",
        objective: "development of a topology-optimized titanium lattice structure manufactured by laser powder bed fusion for load-bearing orthopedic implants matching cortical bone stiffness (15-25 GPa) while promoting osseointegration",
        baseline: "solid titanium implants (Ti-6Al-4V) had stiffness of 110 GPa, causing stress shielding and bone resorption. Published lattice designs achieved 5-40 GPa stiffness ranges but with insufficient fatigue life (<500,000 cycles vs. 10M required for implants). Surface roughness from LPBF (Ra 8-15μm) was uncontrolled and showed inconsistent biological response. No implant-grade lattice met all stiffness, fatigue, and biological requirements.",
        uncertainties: [
            "whether a lattice unit cell geometry could be designed to achieve target apparent stiffness of 15-25 GPa while maintaining fatigue endurance exceeding 10 million cycles at physiological loading (3x body weight)",
            "whether LPBF process parameters could produce lattice struts with consistent cross-sections and surface quality, given that partially melted powder particles create random surface asperities affecting both mechanical properties and biological response",
            "whether the as-built surface topography of LPBF lattices could be modified by chemical or electrochemical post-processing to promote osteoblast adhesion and proliferation without compromising strut cross-section and mechanical properties",
            "whether the mechanical properties and biological response of small-scale test coupons would translate to full-scale implant geometries with complex loading conditions and anatomical constraints"
        ],
        experiments: [
            "Finite element analysis and topology optimization of 12 unit cell geometries (BCC, FCC, TPMS gyroid, diamond, octet-truss variants) evaluating stiffness, yield strength, and fatigue life predictions",
            "LPBF parameter mapping: laser power (8 levels) × scan speed (6 levels) × hatch spacing (4 levels) × layer thickness (3 levels) evaluating strut density, dimensional accuracy, and surface roughness by micro-CT and profilometry",
            "Chemical etching (HF/HNO3) and electrochemical polishing trials with 4 electrolyte compositions and 5 current density profiles, characterizing surface roughness, strut dimensional change, and corrosion resistance",
            "In-vitro biological testing: osteoblast cell culture on 8 surface conditions measuring adhesion (4h), proliferation (7 days), and differentiation markers (ALP, osteocalcin at 14 and 21 days)"
        ],
        results: "TPMS gyroid lattice with 65% porosity and 1.2mm unit cell achieved 18.5 GPa apparent stiffness and >10M cycle fatigue life. Electrochemical polishing reduced Ra from 12μm to 3.5μm. Modified surfaces showed 3.2x improvement in osteoblast ALP expression. 5 unit cell and 4 surface treatment iterations."
    },
    {
        title: "Quantum-Resistant Cryptographic Key Exchange",
        field: "cybersecurity",
        personnel: "Cryptography Researchers, Security Engineers, Network Engineers, and Performance Optimization Specialists",
        objective: "development of a lattice-based key encapsulation mechanism providing 256-bit post-quantum security while achieving TLS handshake completion within 50ms and key sizes under 2KB for deployment in resource-constrained IoT networks",
        baseline: "NIST post-quantum candidates (CRYSTALS-Kyber, NTRU, SABER) provided quantum resistance but with key sizes of 800-1500 bytes and 1-5ms computational overhead per operation on server hardware. On constrained IoT devices (ARM Cortex-M4, 64KB RAM), these schemes required 50-200ms per key encapsulation with 4-8KB combined key material. No scheme met all constraints of 256-bit security, <50ms handshake, and <2KB keys on IoT hardware.",
        uncertainties: [
            "whether a structured lattice-based KEM could be designed with key sizes under 2KB while maintaining IND-CCA2 security at the 256-bit classical equivalent security level — smaller key sizes typically require relaxed security assumptions",
            "whether the NTT (Number Theoretic Transform) operations central to lattice-based schemes could be optimized for ARM Cortex-M4 architecture to achieve <50ms total handshake including symmetric operations, given the limited multiply-accumulate throughput",
            "whether the proposed scheme's security reduction could be proven tight enough to guarantee 256-bit security without relying on heuristic assumptions about lattice problem hardness",
            "whether the implementation could be made resistant to timing and power side-channel attacks without exceeding the computational budget, as constant-time implementations typically incur 20-40% overhead"
        ],
        experiments: [
            "Parameterized exploration of 200+ lattice dimension/modulus/error distribution combinations evaluating estimated security level (Core-SVP methodology), key sizes, ciphertext sizes, and decapsulation failure probability",
            "ARM Cortex-M4 optimized NTT implementations comparing 4 algorithmic variants (iterative Cooley-Tukey, merged layers, incomplete NTT, Karatsuba-augmented) with and without DSP instruction usage",
            "Side-channel evaluation using electromagnetic emanation analysis on 3 test implementations, performing 100,000 trace power analyses (CPA, DPA) and template attacks to validate constant-time properties",
            "TLS integration testing: modified TLS 1.3 handshake with hybrid classical/post-quantum key exchange measured across 6 network conditions (LAN, WiFi, LTE, satellite) and 4 device types"
        ],
        results: "Novel module-LWE scheme achieving 262-bit security with 1,568-byte combined key material. NTT optimization reached 38ms full handshake on Cortex-M4. Constant-time implementation adds 18% overhead (within budget). No side-channel leakage detected in 100K-trace analysis. 7 parameter iterations."
    },
    {
        title: "Autonomous Robotic Welding Quality Control",
        field: "manufacturing/robotics",
        personnel: "Welding Engineers, Machine Vision Specialists, Robotics Engineers, and Quality Assurance Specialists",
        objective: "development of an in-process weld quality monitoring system using multi-sensor fusion (thermal, acoustic, visual) achieving real-time defect detection with >97% accuracy and closed-loop parameter correction within 100ms",
        baseline: "post-weld inspection (X-ray, ultrasonic) detected defects at 95% accuracy but only after completion, resulting in scrapped parts. In-process monitoring using single-sensor approaches (thermal camera or acoustic emission) achieved 75-85% defect detection. No system combined multi-sensor fusion with closed-loop real-time parameter adjustment at welding speeds.",
        uncertainties: [
            "whether thermal, acoustic, and visual signals from the weld pool and heat-affected zone could be fused into a unified defect signature with sufficient discriminative power to classify porosity, lack of fusion, undercut, and spatter in real-time",
            "whether the sensor fusion and classification pipeline could operate within 100ms latency to enable closed-loop correction before the defect region cools past the point of remediation",
            "whether corrective weld parameter adjustments (wire feed speed, voltage, travel speed, oscillation pattern) computed from detected defect signatures could actually repair in-progress defects without introducing new ones",
            "whether the system could generalize across different joint geometries (butt, fillet, lap), material thicknesses (2-20mm), and welding positions (flat, horizontal, vertical, overhead)"
        ],
        experiments: [
            "Multi-sensor data collection: synchronized 1kHz thermal imaging (MWIR), 50kHz acoustic emission, and 500fps high-speed visual capture on 500+ weld runs with intentionally introduced defects and post-weld metallographic validation",
            "Temporal convolutional network architecture evaluation: 6 fusion strategies (early, late, attention-based, cross-modal transformer) optimized for 100ms inference on NVIDIA Jetson AGX Orin embedded GPU",
            "Closed-loop correction experiments: developed lookup tables and model-predictive controllers mapping defect signatures to parameter adjustments, validated on 200 controlled defect-correction trials",
            "Generalization testing across 4 joint types, 5 material thicknesses, and 4 welding positions with domain adaptation techniques for cross-configuration transfer"
        ],
        results: "Achieved 97.8% defect detection accuracy with cross-modal transformer fusion in 72ms inference time. Closed-loop correction repaired 83% of detected porosity and 71% of lack-of-fusion defects in-progress. System generalized to new joint types with 30 calibration welds. 5 fusion architecture iterations."
    },
    {
        title: "Precision Agriculture Crop Health Monitoring",
        field: "agriculture/remote sensing",
        personnel: "Agricultural Scientists, Remote Sensing Engineers, Data Scientists, and Drone Operations Specialists",
        objective: "development of a hyperspectral drone-based imaging system detecting crop nutrient deficiencies and disease onset 7-14 days before visible symptoms, achieving field-level prescription maps at 10cm spatial resolution",
        baseline: "satellite-based multispectral imagery (Sentinel-2, Planet) provided NDVI-based crop health monitoring at 3-10m resolution but only detected problems after visible symptom onset. Drone-mounted RGB cameras improved resolution but lacked spectral sensitivity for early stress detection. Hyperspectral ground-based instruments detected pre-symptomatic stress in controlled studies but had never been validated for drone-based field-scale deployment.",
        uncertainties: [
            "whether a push-broom hyperspectral sensor (400-1000nm, 200+ bands) could be stabilized sufficiently on a moving drone platform to achieve usable spectral data at 10cm ground sampling distance, given vibration and attitude variations during flight",
            "whether pre-symptomatic spectral signatures for nitrogen, phosphorus, and potassium deficiency could be separated from natural canopy spectral variability caused by cultivar differences, growth stage, soil background, and atmospheric conditions",
            "whether a predictive model could reliably forecast the spatial pattern of nutrient deficiency development 7-14 days before visible symptoms using only spectral data, without requiring destructive tissue sampling for calibration",
            "whether the radiometric calibration of drone-based hyperspectral data could achieve sufficient consistency for temporal comparisons, given variable illumination conditions between flight missions"
        ],
        experiments: [
            "Sensor integration and stabilization testing: evaluated 3 gimbal systems and 2 IMU-based motion compensation approaches with controlled vibration inputs, measuring residual spectral mixing error at 5 flight speeds",
            "Controlled field trials on 4 crop types (corn, soybean, wheat, canola) with 6 induced nutrient deficiency levels, collecting weekly drone hyperspectral imagery paired with destructive tissue analysis and soil sampling over full growing season",
            "Spectral unmixing and machine learning pipeline: tested partial least squares regression, random forests, 1D-CNN, and spectral transformer models for nutrient status prediction, validated against tissue analysis with 5-fold temporal cross-validation",
            "Multi-temporal radiometric normalization experiments comparing 4 approaches: empirical line method, panel-based calibration, MODTRAN atmospheric correction, and cross-calibration with ground spectroradiometer measurements"
        ],
        results: "Detected nitrogen deficiency 11 days pre-symptomatic (R²=0.89), phosphorus 8 days (R²=0.82), potassium 6 days (R²=0.76). 10cm pixel resolution achieved at 30m altitude, 5 m/s flight speed. Panel-based radiometric calibration achieved <3% reflectance RMSE. System operational on 200-hectare fields in under 2 hours."
    },
    {
        title: "Energy-Efficient HVAC Control via Reinforcement Learning",
        field: "building automation/AI",
        personnel: "Building Systems Engineers, Machine Learning Researchers, Controls Engineers, and Energy Analysts",
        objective: "development of a model-based reinforcement learning controller for commercial HVAC systems reducing energy consumption by >25% while maintaining thermal comfort within ASHRAE 55 adaptive comfort standards",
        baseline: "conventional PID-based HVAC control typically used 15-20% excess energy due to conservative set-points and inability to anticipate thermal loads. Rule-based optimization achieved 10-15% savings. Published RL approaches showed 15-25% savings in simulation but suffered from long exploration periods (weeks to months) when deployed in real buildings, during which occupant comfort was violated.",
        uncertainties: [
            "whether a thermal dynamics model of sufficient accuracy could be learned from building sensor data alone to enable model-based RL, avoiding the lengthy and disruptive real-world exploration required by model-free approaches",
            "whether the learned model could capture the complex multi-zone thermal interactions, solar gain dynamics, and occupancy-driven internal loads that determine comfort and energy in commercial buildings",
            "whether the RL controller could adapt to seasonal changes, occupancy pattern shifts, and equipment degradation over time without requiring manual recalibration or retraining from scratch",
            "whether the controller could be safely transferred between buildings with different HVAC configurations, geometries, and climate zones with minimal site-specific adaptation data"
        ],
        experiments: [
            "Collected 12 months of operational data from 3 commercial buildings (office tower, retail complex, university building) at 1-minute resolution: HVAC setpoints, zone temperatures, energy consumption, weather, and occupancy from 1,200+ sensors",
            "Developed and evaluated 5 neural network architectures for thermal dynamics modeling: feed-forward, LSTM, physics-informed neural network, graph neural network, and neural ODE, measuring 24-hour temperature prediction accuracy",
            "Trained and benchmarked 4 RL algorithms (SAC, PPO, MBPO, PETS) in calibrated simulation, then deployed top 2 candidates in a 6-zone pilot area with safety constraints limiting temperature deviation to ±1°C from conventional controller",
            "Cross-building transfer experiments: trained on Building A data, adapted with 2 weeks of Building B data, compared to purpose-trained Building B controller across 4 weeks of operation"
        ],
        results: "Achieved 28% energy reduction with <0.5°C average comfort deviation. Physics-informed neural network predicted 24h zone temperatures with 0.3°C RMSE. MBPO algorithm converged in 3 days of real deployment (vs. 6 weeks for model-free SAC). Cross-building transfer achieved 22% savings with only 2 weeks adaptation."
    },
    {
        title: "Blockchain-Based Supply Chain Provenance System",
        field: "software/supply chain",
        personnel: "Distributed Systems Engineers, Cryptography Specialists, Supply Chain Analysts, and Performance Engineers",
        objective: "development of a DAG-based distributed ledger achieving 5,000+ TPS for supply chain event recording with cryptographic provenance verification across 10,000+ participating nodes, without energy-intensive consensus mechanisms",
        baseline: "Ethereum achieved 15-30 TPS. Hyperledger Fabric reached 3,000 TPS but with centralized orderer bottleneck limiting decentralization. IOTA's DAG achieved high throughput but lacked Byzantine fault tolerance for enterprise use. No system combined >5,000 TPS with full BFT consensus across 10,000+ nodes for supply chain applications.",
        uncertainties: [
            "whether a DAG-based consensus protocol could achieve both BFT safety and liveness guarantees with >5,000 TPS at 10,000+ node scale, as existing asynchronous BFT protocols scaled poorly beyond 100 nodes",
            "whether cryptographic provenance chains could be verified efficiently enough to maintain throughput targets when query depth exceeded 100 supply chain hops across multiple product lineages",
            "whether the system could maintain consistency guarantees during network partitions that commonly occur in global supply chains operating across regions with variable connectivity",
            "whether privacy-preserving computations (zero-knowledge proofs for competitive supply chain data) could be integrated without reducing throughput below the 5,000 TPS target"
        ],
        experiments: [
            "Designed and simulated 4 DAG consensus protocols (parallel-chain BFT, asynchronous optimal BFT, committee-rotated consensus, and novel sharded DAG protocol) at network sizes from 100 to 50,000 nodes measuring throughput, latency, and safety under Byzantine faults",
            "Implemented Merkle-DAG provenance indexing with 3 caching strategies and evaluated query latency for provenance chains of 10-500 hops across 1M supply chain events",
            "Network partition simulations: injected 50 partition scenarios varying in duration (1s to 1h), topology, and timing, measuring consistency violation rates and recovery times for each consensus protocol",
            "Integrated and benchmarked 3 ZKP systems (Groth16, PLONK, Nova folding) for selective supply chain data disclosure, measuring proof generation time, verification time, and impact on end-to-end throughput"
        ],
        results: "Novel sharded DAG protocol achieved 7,200 TPS across 10,000 nodes with BFT tolerance up to f<n/3. Provenance query latency <200ms for 500-hop chains with hierarchical caching. Zero consistency violations across all partition scenarios. Nova folding scheme maintained 5,800 TPS with privacy proofs. 6 protocol iterations."
    }
];

// ============================================
// T661 REPORT GENERATION (proper word counts)
// ============================================

function generateRandomT661() {
    const project = pickRandom(RANDOM_PROJECTS);
    showLoading(true);

    setTimeout(() => {
        try {
            const result = buildRandomReport(project);
            displayResults(result, project.title);
            document.getElementById('help-text').style.display = 'none';
        } catch (e) {
            console.error('Generation error:', e);
            alert('Error generating report. Try again.');
        } finally {
            showLoading(false);
            updateStats();
        }
    }, 200);
}

function buildRandomReport(p) {
    return {
        line242: buildLine242(p),
        line244: buildLine244(p),
        line246: buildLine246(p)
    };
}

function buildLine242(p) {
    // Paragraph 1: Objective (~100 words)
    const objectiveParas = [
        `The objective of this project was to achieve a technological advancement in the field of ${p.field} through the ${p.objective}. This initiative was undertaken to develop new technological knowledge and capabilities that extended beyond what was achievable through the application of standard practices and existing methodologies available to professionals working in this domain. The project required a team of ${p.personnel} to conduct systematic investigation and experimentation to address fundamental technical challenges that could not be resolved through routine engineering or by consulting publicly available information.`,

        `This project sought to achieve a technological advancement through the ${p.objective}. The project's core aim was to push the boundaries of existing technology in the field of ${p.field} by developing novel approaches and generating new technical knowledge. The work was carried out by ${p.personnel}, who undertook systematic experimental investigation to address challenges that lay beyond the scope of standard industry practices. The specific technical goals of this project necessitated investigation and development work that could not have been accomplished through the straightforward application of existing tools, methods, or commercially available solutions.`,

        `The technological advancement pursued in this project involved the ${p.objective}. This endeavor represented a significant departure from conventional approaches in the field of ${p.field}, requiring the generation of new knowledge through systematic experimentation and analysis. The project team, comprising ${p.personnel}, was assembled specifically to investigate and resolve a set of interconnected technological challenges that could not be addressed through standard engineering practices or by applying commercially available solutions. The technical objectives of this work went beyond incremental improvements and required fundamentally new understanding of the underlying phenomena.`
    ];

    // Paragraph 2: Baseline (~120 words)
    const baselineParas = [
        `At the outset of this project, the state of technology and standard practice in this field was as follows: ${p.baseline} These limitations represented fundamental constraints in the existing technological base that defined the boundaries of what a competent professional could accomplish using available knowledge, tools, and techniques. While incremental improvements within these established parameters were possible through standard engineering, the performance requirements of this project fell substantially outside the envelope of achievable outcomes using any combination of existing approaches. The gap between the current state of technology and the project objectives was not merely quantitative but required qualitative breakthroughs in approach and methodology.`,

        `Prior to the commencement of this project, the technological baseline in this area was characterized by the following limitations: ${p.baseline} The existing body of knowledge and commercially available solutions were insufficient to meet the technical requirements of this project. A comprehensive review of published literature, industry best practices, vendor documentation, and patent databases confirmed that no documented methodology or combination of existing technologies could address the specific technical challenges identified. The project objectives exceeded the established performance boundaries of current technology by a margin that could not be bridged through the optimization or incremental improvement of existing approaches.`,

        `At the commencement of this project, the existing state of technology was as follows: ${p.baseline} The limitations of current technology in this domain were well-documented and represented barriers that the broader technical community had not yet overcome. Standard industry practices and commercially available solutions operated within established performance boundaries that fell significantly short of the project's requirements. A thorough assessment of the technological landscape, including academic publications, industry standards, and vendor offerings, confirmed that no existing methodology could achieve the combination of technical parameters required by this project.`
    ];

    // Paragraph 3: Advancement + Beyond Standard Practice (~200 words)
    const advancementParas = [
        `The specific technological advancement sought was the ${p.objective}. This advancement, if achieved, would represent a meaningful contribution to the technological knowledge base in this field and would extend the capabilities available to practitioners beyond what was possible using established methods.\n\nThis advancement could not have been achieved through standard practice or routine engineering because the required performance parameters exceeded the capabilities of any documented approach or commercial solution. A competent professional working in this field, even with access to the full body of publicly available knowledge and standard tools, would not have been able to predict the feasibility of the proposed approach or determine the specific technical parameters required for success without conducting the systematic investigation described herein. The outcomes of this work were inherently uncertain and could only be established through experimental investigation.`,

        `The technological advancement sought through this project was the ${p.objective}. Achieving this advancement required discovering new relationships between technical variables, developing novel methodologies, and generating knowledge that did not previously exist in any form accessible to practitioners in this field.\n\nThis advancement went beyond what could be achieved through standard practice because no combination of existing techniques, commercial products, or documented procedures could satisfy the project's technical requirements. The specific challenges involved interactions between multiple technical parameters whose combined effects were unknown and could not be predicted from first principles or existing empirical data. A competent professional in this field would have recognized these challenges as lying outside the established boundaries of current knowledge and practice. The resolution of these challenges required systematic investigation through experimentation and analysis, the outcomes of which could not be determined in advance.`,

        `The technological advancement pursued was the ${p.objective}. This represented a genuine advance in the state of technology rather than an application or adaptation of existing knowledge, as it required the creation of new technical understanding that was not available through any existing channel.\n\nThis advancement could not have been realized through the application of standard practices, routine engineering, or the use of established tools and techniques. The technical challenges associated with this project were of a fundamental nature, involving unknowns that could not be resolved through theoretical analysis alone or by extrapolating from existing data. Even a highly competent professional with extensive experience in this field would not have been able to achieve the project objectives without undertaking systematic experimental work, as the necessary knowledge simply did not exist in the public domain or within standard industry practice.`
    ];

    return pickRandom(objectiveParas) + '\n\n' + pickRandom(baselineParas) + '\n\n' + pickRandom(advancementParas);
}

function buildLine244(p) {
    // Opening paragraph
    const openings = [
        `At the commencement of this project, the following technological uncertainties existed that could not be resolved by a competent professional in the field using standard practice, publicly available technical literature, or existing knowledge bases. These uncertainties were technological in nature and pertained to fundamental questions about feasibility, methodology, and the relationships between critical technical parameters:`,

        `The following technological uncertainties were identified at the outset of this project. These uncertainties could not have been resolved by a competent professional through the application of standard practices, reference to available technical publications, or consultation with recognized experts in the field. Each uncertainty represented a genuine gap in the existing body of technical knowledge:`,

        `At the start of this project, several significant technological uncertainties existed that prevented the project objectives from being achieved through the straightforward application of existing knowledge. These uncertainties were identified through a systematic assessment of the current state of technology and represented genuine unknowns that could not be resolved without conducting experimental investigation:`
    ];

    // Build uncertainty paragraphs - use ALL uncertainties with elaboration
    const elaborations = [
        `This uncertainty was fundamental to the project because without resolving it, the viability of the entire approach could not be determined. Standard references and industry documentation did not provide guidance on this specific technical question, and the interactions between the relevant parameters were complex and unpredictable.`,
        `This represented a critical knowledge gap that could not be addressed through theoretical modeling alone or by consulting existing technical resources. The specific conditions and performance requirements of this project created a unique set of constraints for which no precedent existed in the published literature.`,
        `Resolving this uncertainty required empirical investigation because the relationships between the relevant technical variables under the specific conditions of this project were not documented in any available source. The complexity of the interactions involved made theoretical prediction unreliable.`,
        `The resolution of this uncertainty could not be predicted from first principles or by extrapolation from published data, as the specific combination of parameters and constraints involved in this project had not been previously investigated or documented in the available body of knowledge.`
    ];

    let uncertaintyText = '';
    p.uncertainties.forEach((u, i) => {
        uncertaintyText += `${i + 1}. It was uncertain ${u}. ${pickRandom(elaborations)}\n\n`;
    });

    // Closing paragraph
    const closings = [
        `These technological uncertainties could not be resolved through standard practice because the specific combination of performance requirements, technical constraints, and operating conditions represented by this project fell outside the boundaries of documented knowledge in this field. A competent professional, even with extensive experience and access to all publicly available resources, could not have predicted the outcomes or determined appropriate solutions without conducting systematic experimental investigation. The hypotheses formulated to address these uncertainties had to be tested empirically, as no theoretical framework existed that could reliably predict the results under the specific conditions of this project.`,

        `The resolution of these uncertainties required systematic experimentation and analysis that went beyond standard engineering practice. No combination of existing knowledge, published literature, vendor specifications, or expert consultation could provide definitive answers to these technical questions. The project team formulated hypotheses based on their professional expertise, but the validity of these hypotheses could only be established through controlled experimental investigation, as the relevant phenomena were not sufficiently understood to permit reliable theoretical prediction. A competent professional in this field would recognize that these uncertainties represented genuine gaps in the current body of technological knowledge.`,

        `These uncertainties represented genuine gaps in the technological knowledge base that could not be bridged by applying standard practices or consulting existing resources. The technical questions posed by this project were not answerable through routine engineering analysis, as they involved complex interactions and phenomena that had not been adequately characterized in the available literature. To address these uncertainties, the project team developed specific hypotheses and designed experiments to test them systematically. The outcomes were not determinable in advance and could only be established through empirical investigation.`
    ];

    return pickRandom(openings) + '\n\n' + uncertaintyText + pickRandom(closings);
}

function buildLine246(p) {
    // Opening paragraph
    const openings = [
        `A systematic investigation was conducted by a team of ${p.personnel} to address the technological uncertainties identified above. The work followed a structured experimental methodology designed to test specific hypotheses, collect empirical data, and iteratively refine the approach based on experimental results. The investigation was planned and executed in accordance with the principles of scientific inquiry, with clear experimental objectives, controlled test conditions, and rigorous data analysis at each stage.`,

        `To resolve the technological uncertainties described in Line 244, a systematic program of experimentation and analysis was undertaken by ${p.personnel}. The investigation was structured as a series of experimental phases, each designed to address specific aspects of the technological uncertainties while building upon the knowledge generated in preceding phases. The team employed a hypothesis-driven methodology, designing controlled experiments, collecting quantitative data, analyzing results, and using the findings to guide subsequent investigation.`,

        `The following systematic investigation was carried out to address the technological uncertainties identified above. The work was performed by qualified ${p.personnel} and followed a structured experimental methodology combining hypothesis formulation, controlled experimentation, data collection and analysis, and iterative refinement of the technical approach. Each experimental phase was designed to generate specific technical knowledge necessary for resolving one or more of the identified uncertainties.`
    ];

    // Experiment phases - use ALL experiments with elaboration
    const phaseElaborations = [
        `The results of this phase of investigation were carefully documented, analyzed, and used to refine the technical approach for subsequent experimental work. Multiple iterations were conducted within this phase, with each iteration informed by the quantitative data and observations from the preceding one. The team systematically varied experimental parameters to characterize the relationships between critical variables and identify the conditions that yielded optimal outcomes.`,

        `This experimental work generated quantitative data that was analyzed using statistical methods to evaluate the significance of observed effects and relationships between variables. The findings from this phase informed design decisions and guided the focus of subsequent investigation. Where results deviated from initial hypotheses, additional targeted experiments were designed and executed to understand the underlying causes and refine the team's understanding.`,

        `The data generated from this phase was subjected to rigorous analysis to extract meaningful insights about the underlying technical phenomena. The experimental results were compared against initial hypotheses and theoretical predictions, and discrepancies were investigated through additional controlled experiments. Lessons learned from this phase were incorporated into the experimental design of subsequent phases to maximize the efficiency of the investigation.`,

        `Comprehensive records were maintained throughout this phase, including raw data, observations, experimental conditions, and analytical results. The team reviewed findings from each iteration to identify trends, validate or refute hypotheses, and determine the most promising directions for continued investigation. This systematic approach ensured that each experiment contributed meaningful knowledge toward resolving the identified uncertainties.`
    ];

    let experimentText = '';
    p.experiments.forEach((exp, i) => {
        const labels = ['Phase', 'Experimental Phase', 'Investigation Phase', 'Stage'];
        experimentText += `${pickRandom(labels)} ${i + 1}: ${exp}\n\n${pickRandom(phaseElaborations)}\n\n`;
    });

    // Results and conclusions
    const conclusions = [
        `The investigation yielded the following key results and conclusions: ${p.results} These results represent the culmination of the systematic experimental program described above and constitute new technological knowledge that was not available prior to the commencement of this project. The knowledge generated through this investigation advances the state of technology in this field and was achieved solely through the systematic experimental work described herein.`,

        `Results and Conclusions: ${p.results} The outcomes described above were achieved through the systematic experimental investigation detailed in the preceding phases. Each result represents new technical knowledge that was generated through empirical experimentation and analysis, and could not have been predicted or obtained through the application of existing knowledge or standard industry practices.`,

        `Conclusions of the Investigation: ${p.results} These outcomes were not determinable in advance and could only have been established through the systematic program of experimentation and analysis described above. The findings constitute a genuine advancement in the state of technical knowledge in this field and were dependent on the experimental methodology employed.`
    ];

    // Closing SR&ED statement
    const closings = [
        `The work described above constitutes a systematic investigation carried out in a field of science or technology by means of experiment and analysis. The investigation was undertaken for the purpose of achieving a technological advancement and involved the identification and resolution of technological uncertainties through planned experimentation. The work is consistent with the definition of scientific research and experimental development under subsection 248(1) of the Income Tax Act.`,

        `The systematic investigation described above represents eligible SR&ED work as it involved planned experimentation conducted for the purpose of achieving a technological advancement through the resolution of technological uncertainties. The work was carried out by qualified personnel using scientific methodology, and the outcomes could not have been determined in advance without conducting the experimental work described.`,

        `This investigation involved systematic experimental work conducted for the purpose of achieving a technological advancement that could not have been accomplished through routine engineering or standard practices. The work involved the formulation and testing of hypotheses, controlled experimentation, and iterative analysis, all of which are consistent with the definition of SR&ED under the Income Tax Act.`
    ];

    return pickRandom(openings) + '\n\n' + experimentText + pickRandom(conclusions) + '\n\n' + pickRandom(closings);
}

// ============================================
// DISPLAY - Results with word-level feedback
// ============================================

function displayResults(sections, title) {
    const container = document.getElementById('results-container');
    container.style.display = 'block';
    currentGenerationId++;
    localStorage.setItem('sred_gen_id', currentGenerationId);
    const genId = `gen_${currentGenerationId}_${Date.now()}`;

    const sectionNames = {
        line242: 'Line 242 — Scientific or Technological Advancement',
        line244: 'Line 244 — Scientific or Technological Uncertainty',
        line246: 'Line 246 — Work Performed'
    };

    let html = `
        <div class="results-header">
            <h2>T661 Report</h2>
            <p class="results-title">${title}</p>
        </div>
    `;

    for (const [key, text] of Object.entries(sections)) {
        if (!text) continue;
        const name = sectionNames[key] || key;
        const wordCount = countWords(text);

        html += `
            <div class="generated-section" data-gen-id="${genId}" data-section="${key}">
                <div class="section-header">
                    <h4>${name}</h4>
                    <span class="word-count">${wordCount} words</span>
                </div>
                <div class="generated-text fb-container">
                    ${buildFeedbackSection(key, text, genId)}
                </div>
            </div>
        `;
    }

    html += `
        <div class="gen-actions">
            <button class="gen-btn" onclick="generateRandomT661()">🎲 Next Random T661</button>
            <button class="copy-all-btn" onclick="copyAllText()">📋 Copy All</button>
        </div>
    `;

    container.innerHTML = html;
    container.scrollIntoView({ behavior: 'smooth' });
}

function buildFeedbackSection(sectionKey, text, genId) {
    const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);

    let html = '';
    paragraphs.forEach((para, i) => {
        const existing = feedbackStore.find(f =>
            f.genId === genId && f.section === sectionKey && f.paraIndex === i
        );
        const upClass = existing && existing.rating === 'up' ? 'active-up' : '';
        const downClass = existing && existing.rating === 'down' ? 'active-down' : '';

        // Wrap each word in a clickable span for word-level feedback
        const wordSpans = wrapWordsInSpans(para, sectionKey, i, genId);

        html += `
            <div class="fb-paragraph" data-para-index="${i}">
                <div class="fb-para-text">${wordSpans}</div>
                <div class="fb-actions">
                    <button class="fb-btn fb-up ${upClass}" onclick="rateParagraph(this, '${sectionKey}', ${i}, 'up')" title="Good paragraph">👍</button>
                    <button class="fb-btn fb-down ${downClass}" onclick="rateParagraph(this, '${sectionKey}', ${i}, 'down')" title="Bad paragraph">👎</button>
                </div>
            </div>
        `;
    });

    return html;
}

function wrapWordsInSpans(text, sectionKey, paraIndex, genId) {
    // Split into words and whitespace, preserving spacing
    const tokens = text.split(/(\s+)/);
    let wordIndex = 0;

    return tokens.map(token => {
        if (/^\s+$/.test(token)) return token; // Keep whitespace as-is
        const idx = wordIndex++;
        const isBad = badWordsStore.some(w =>
            w.genId === genId && w.section === sectionKey &&
            w.paraIndex === paraIndex && w.wordIndex === idx
        );
        const cls = isBad ? 'word bad' : 'word';
        return `<span class="${cls}" data-word-index="${idx}" onclick="toggleBadWord(this,'${sectionKey}',${paraIndex},${idx})">${token}</span>`;
    }).join('');
}

// ============================================
// FEEDBACK SYSTEM
// ============================================

function rateParagraph(btn, sectionKey, paraIndex, rating) {
    const paraEl = btn.closest('.fb-paragraph');
    const paraText = paraEl.querySelector('.fb-para-text').textContent.trim();
    const sectionEl = paraEl.closest('.generated-section');
    const genId = sectionEl.dataset.genId;

    // Toggle off if already selected
    const existing = feedbackStore.findIndex(f =>
        f.genId === genId && f.section === sectionKey && f.paraIndex === paraIndex
    );

    if (existing >= 0) {
        if (feedbackStore[existing].rating === rating) {
            // Un-rate
            feedbackStore.splice(existing, 1);
            paraEl.querySelectorAll('.fb-btn').forEach(b => b.classList.remove('active-up', 'active-down'));
            saveFeedback();
            return;
        }
        feedbackStore.splice(existing, 1);
    }

    // Get full section text for training context
    const fullText = sectionEl.querySelector('.generated-text').textContent.trim();

    const entry = {
        type: 'paragraph',
        genId,
        section: sectionKey,
        paraIndex,
        paraText,
        fullSectionText: fullText,
        rating,
        timestamp: new Date().toISOString()
    };

    feedbackStore.push(entry);

    // Update button visuals
    paraEl.querySelectorAll('.fb-btn').forEach(b => b.classList.remove('active-up', 'active-down'));
    btn.classList.add(rating === 'up' ? 'active-up' : 'active-down');

    // Flash animation
    paraEl.classList.add('fb-flash-' + rating);
    setTimeout(() => paraEl.classList.remove('fb-flash-' + rating), 400);

    saveFeedback();
    pushToServer(entry);
}

function toggleBadWord(span, sectionKey, paraIndex, wordIndex) {
    const sectionEl = span.closest('.generated-section');
    const genId = sectionEl.dataset.genId;
    const word = span.textContent.trim();

    const idx = badWordsStore.findIndex(w =>
        w.genId === genId && w.section === sectionKey &&
        w.paraIndex === paraIndex && w.wordIndex === wordIndex
    );

    if (idx >= 0) {
        // Toggle off
        badWordsStore.splice(idx, 1);
        span.classList.remove('bad');
    } else {
        const entry = {
            type: 'word',
            genId,
            section: sectionKey,
            paraIndex,
            wordIndex,
            word,
            timestamp: new Date().toISOString()
        };
        badWordsStore.push(entry);
        span.classList.add('bad');
        pushToServer(entry);
    }

    saveBadWords();
    updateStats();
}

function saveFeedback() {
    localStorage.setItem('sred_feedback', JSON.stringify(feedbackStore));
    updateStats();
}

function saveBadWords() {
    localStorage.setItem('sred_bad_words', JSON.stringify(badWordsStore));
    updateStats();
}

async function pushToServer(entry) {
    if (!aiServerOnline) return;
    try {
        await fetch(`${getServerUrl()}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        });
        // Server auto-exports DPO/SFT on every feedback submission
    } catch (e) {
        // Saved locally — will sync later
    }
}

async function syncFeedbackToServer() {
    if (!aiServerOnline) return;
    const serverUrl = getServerUrl();
    try {
        const resp = await fetch(`${serverUrl}/feedback`, { signal: AbortSignal.timeout(3000) });
        const data = await resp.json();
        const serverCount = data.count || 0;
        const localCount = feedbackStore.length + badWordsStore.length;

        if (localCount > serverCount) {
            // Push all local feedback
            const allEntries = [
                ...feedbackStore.map(f => ({ ...f, type: f.type || 'paragraph' })),
                ...badWordsStore.map(w => ({ ...w, type: 'word' }))
            ];
            for (const entry of allEntries) {
                await fetch(`${serverUrl}/feedback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(entry)
                });
            }
            console.log(`Synced ${localCount} feedback items to server`);
        }

        // Update trained count from server
        const el = document.getElementById('stat-trained');
        if (el && data.trained_count !== undefined) {
            el.textContent = data.trained_count;
        }
    } catch (e) {
        console.log('Feedback sync skipped:', e.message);
    }
}

// ============================================
// SERVER CONNECTION
// ============================================

function getServerUrl() {
    return window._sredServerUrl || localStorage.getItem('sred_server_url') || 'http://localhost:5000';
}

async function checkAIServer(customUrl) {
    const url = customUrl || getServerUrl();
    const barDot = document.getElementById('server-status-dot');
    const barLabel = document.getElementById('server-status-label');

    try {
        const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
        const data = await response.json();

        if (data.status === 'ok') {
            aiServerOnline = true;
            const fbCount = data.feedback_count || 0;

            if (barDot) {
                barDot.className = 'status-dot online';
                barLabel.textContent = `Connected (${fbCount} ratings on server)`;
            }

            // Sync local feedback to server
            syncFeedbackToServer();
        }
    } catch (e) {
        aiServerOnline = false;
        if (barDot) {
            barDot.className = 'status-dot offline';
            barLabel.textContent = 'Not connected — feedback saved locally';
        }
    }
}

function connectToServer() {
    let url = document.getElementById('server-url-input').value.trim();
    if (!url) url = 'http://localhost:5000';
    url = url.replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    localStorage.setItem('sred_server_url', url);
    window._sredServerUrl = url;
    document.getElementById('server-url-input').value = url;
    checkAIServer(url);
}

// ============================================
// UI HELPERS
// ============================================

function showLoading(show) {
    document.getElementById('ai-loading').style.display = show ? 'flex' : 'none';
}

function updateStats() {
    const upCount = feedbackStore.filter(f => f.rating === 'up').length;
    const downCount = feedbackStore.filter(f => f.rating === 'down').length;
    const wordCount = badWordsStore.length;
    const totalTrained = feedbackStore.length + wordCount;

    const el = (id) => document.getElementById(id);
    if (el('stat-up')) el('stat-up').textContent = upCount;
    if (el('stat-down')) el('stat-down').textContent = downCount;
    if (el('stat-words')) el('stat-words').textContent = wordCount;
    if (el('stat-trained')) el('stat-trained').textContent = totalTrained;
}

function clearFeedback() {
    const total = feedbackStore.length + badWordsStore.length;
    if (total === 0) {
        alert('No feedback to clear.');
        return;
    }
    if (confirm(`Clear all ${total} feedback ratings? This cannot be undone.`)) {
        feedbackStore = [];
        badWordsStore = [];
        saveFeedback();
        saveBadWords();
        // Re-display current results without feedback state
        const container = document.getElementById('results-container');
        if (container.style.display !== 'none') {
            document.querySelectorAll('.fb-btn').forEach(b => b.classList.remove('active-up', 'active-down'));
            document.querySelectorAll('.word.bad').forEach(w => w.classList.remove('bad'));
        }
    }
}

function copyAllText() {
    const sections = document.querySelectorAll('.generated-section');
    let allText = '';
    const titles = {
        line242: 'LINE 242 — SCIENTIFIC OR TECHNOLOGICAL ADVANCEMENT',
        line244: 'LINE 244 — SCIENTIFIC OR TECHNOLOGICAL UNCERTAINTY',
        line246: 'LINE 246 — WORK PERFORMED'
    };

    sections.forEach(section => {
        const key = section.dataset.section;
        const title = titles[key] || key;
        const text = section.querySelector('.generated-text').textContent.trim();
        allText += `${title}\n${'='.repeat(50)}\n\n${text}\n\n\n`;
    });

    navigator.clipboard.writeText(allText).then(() => {
        const btn = document.querySelector('.copy-all-btn');
        if (btn) {
            btn.textContent = '✓ Copied!';
            setTimeout(() => btn.textContent = '📋 Copy All', 2000);
        }
    });
}

// ============================================
// INITIALIZATION
// ============================================

(function init() {
    const savedUrl = localStorage.getItem('sred_server_url');
    if (savedUrl) {
        const input = document.getElementById('server-url-input');
        if (input) input.value = savedUrl;
        window._sredServerUrl = savedUrl;
    }    
    checkAIServer(savedUrl || undefined);
    updateStats();
})();

console.log('T661 AI Trainer loaded');
