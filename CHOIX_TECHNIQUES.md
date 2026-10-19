# Document des Choix Techniques — Sujet 14 (Autoscale Event-Driven)

Ce document détaille les justifications architecturales, les alternatives analysées et les limites du système mis en place dans le cadre du projet **autoscale-orders**.

---

## 1. Pourquoi ces outils ? (Justification des choix)

### A. Broker de Messages : Redis
- **Pourquoi Redis :**
  - **Latence ultra-faible en mémoire :** Opérations atomiques `RPUSH` (côté API) et `BRPOP` (côté Worker) exécutées en sous-milliseconde.
  - **Simplicité d'exploitation :** Ne requiert pas de gestion complexe de partitions ou de disques persistants lourds pour une file d'attente volatile de commandes.
  - **Intégration native avec KEDA :** Le scaler Redis de KEDA interroge la commande native `LLEN` de façon standard et très légère.

### B. Moteur d'Autoscaling : KEDA (Kubernetes Event-driven Autoscaling)
- **Pourquoi KEDA :**
  - **Dépassement des limites du HPA standard :** Le HPA natif de Kubernetes ne peut se baser que sur le CPU et la RAM. Au repos (0 pod), la consommation est nulle, empêchant le HPA de détecter le besoin de redémarrage.
  - **Support natif du Scale-to-Zero :** KEDA sait manipuler le `scaleTargetRef` d'un Deployment Kubernetes pour descendre à `0` réplique et remonter dès qu'un message entre dans Redis.
  - **Contrôle précis du cycle de vie :** Gestion native des périodes de `pollingInterval` et de `cooldownPeriod` pour éviter les redémarrages intempestifs (flapping).

### C. Stack d'Observabilité : Prometheus + kube-state-metrics + Grafana
- **Pourquoi cette stack :**
  - **Standard Cloud-Native :** Format de métriques Prometheus universel.
  - **Rôle de kube-state-metrics :** KEDA met à l'échelle le Deployment, mais sans `kube-state-metrics`, Prometheus ne peut pas tracer le nombre de pods lorsque le déploiement est à 0.
  - **Grafana GitOps :** La datasource et le dashboard sont provisionnés automatiquement par ConfigMaps, évitant toute intervention manuelle.

### D. CI/CD : GitHub Actions (séparé en CI et CD)
- **Pourquoi GitHub Actions :**
  - Intégré directement au dépôt sans nécessiter d'agent lourd (type Jenkins).
  - Séparation nette entre la validation du code/conteneurs (CI) et la vérification des manifests Kubernetes et Terraform (CD).

---

## 2. Quelles alternatives ont été envisagées ?

| Rôle | Outil Choisi | Alternatives Évaluées | Pourquoi l'alternative n'a pas été retenue ? |
| :--- | :--- | :--- | :--- |
| **Broker de messages** | **Redis** | **RabbitMQ**, **Apache Kafka** | - **Kafka :** Trop lourd pour ce cas d'usage (nécessite Zookeeper/KRaft, lourd en RAM, surdimensionné pour une simple file FIFO).<br>- **RabbitMQ :** Très bon scaler KEDA mais empreinte mémoire plus élevée que Redis pour un cluster de dev. |
| **Autoscaling** | **KEDA** | **HPA custom metrics** (Prometheus Adapter), **Knative Serving** | - **HPA custom metrics :** Complexe à configurer, nécessite de transformer la métrique Redis en métrique Prometheus puis en Custom Metric API k8s, sans supporter nativement le scale-to-zero propre.<br>- **Knative :** Centré sur le trafic HTTP synchrone (scale-to-zero via Activator), moins adapté aux workers dépilant une file asynchrone. |
| **Infrastructure IaC** | **Terraform** | **Helm CLI pur**, **ArgoCD** | - **Terraform :** Permet de versionner l'installation du chart Helm KEDA de manière déclarative.<br>- **ArgoCD :** Solution GitOps complète mais consommatrice de ressources pour un cluster de test local (Kind). |

---

## 3. Quelles sont les limites de notre solution ?

1. **Persistance des messages Redis :**
   - Dans la configuration actuelle, Redis tourne sans volume persistant (`emptyDir`). En cas de crash inopiné du pod Redis avant le dépilement, les commandes en attente non traitées seraient perdues.
   - *Amélioration en production :* Activer la persistance AOF/RDB avec un `PersistentVolumeClaim` ou utiliser Redis Sentinel / Redis Cluster.

2. **Délai de démarrage à froid (*Cold Start*) :**
   - Lorsque la file passe de 0 à N commandes, il y a un délai de 1 à 3 secondes entre la détection par KEDA et l'état `Running` du conteneur worker (pull d'image, init Node.js).
   - *Mitigation :* Les images Docker sont optimisées en multi-stage (< 50 Mo) pour réduire le temps de pull.

3. **Traitement « At-Least-Once » vs « At-Most-Once » :**
   - La commande `BRPOP` retire immédiatement l'élément de la file. Si le worker crashe pendant son traitement de 1,3 seconde, la commande est perdue.
   - *Amélioration en production :* Utiliser les Redis Streams avec des Consumer Groups (`XREADGROUP` / `XACK`) pour garantir un acquittement après traitement réussi.
