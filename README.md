# Autoscale Orders — Sujet 14 (Event-Driven Autoscaling)

Mise à l'échelle pilotée par les événements avec **KEDA**, **Redis** et **Kubernetes**.

---

## 1. Présentation du Projet

Ce projet implémente une architecture événementielle asynchrone capable d'absorber des pics imprévisibles de commandes e-commerce tout en garantissant une consommation nulle de ressources au repos (**Scale-to-Zero**) :
- **API d'ingestion (`order-api`) :** Reçoit les commandes en HTTP POST et les empile immédiatement dans Redis.
- **Broker de messages (`redis`) :** File d'attente volatile en mémoire vive.
- **Workers de traitement (`order-worker`) :** Microservices autonomes dépilant les commandes via `BRPOP`.
- **Orchestration d'Autoscaling (`KEDA`) :** Sonde la file Redis et ajuste dynamiquement le nombre de pods workers de 0 à 10 répliques.
- **Observabilité (`Prometheus` + `Grafana`) :** Capture en temps réel la taille de la file et les répliques actives.
- **Registre de Conteneurs :** Les images Docker sont automatiquement publiées sur **GitHub Container Registry (GHCR)** sous `ghcr.io/faanrm/order-api` et `ghcr.io/faanrm/order-worker`.

---

## 2. Prérequis

- **Docker** (v20+)
- **kind** (v0.20+)
- **kubectl**
- **Node.js** (v18+)

---

## 3. Déploiement Complet de A à Z

### Étape 1 : Création du cluster Kubernetes local (Kind)
```bash
kind create cluster --name autoscale-cluster --config kind-config.yaml
```

### Étape 2 : Construction et chargement des images Docker
```bash
docker build -t ghcr.io/faanrm/order-api:latest ./services/order-api
docker build -t ghcr.io/faanrm/order-worker:latest ./services/order-worker

kind load docker-image ghcr.io/faanrm/order-api:latest --name autoscale-cluster
kind load docker-image ghcr.io/faanrm/order-worker:latest --name autoscale-cluster
```

### Étape 3 : Installation de KEDA
```bash
kubectl apply --server-side -f https://github.com/kedacore/keda/releases/download/v2.14.0/keda-2.14.0.yaml
```

### Étape 4 : Installation de kube-state-metrics
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/examples/standard/service-account.yaml \
  -f https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/examples/standard/cluster-role.yaml \
  -f https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/examples/standard/cluster-role-binding.yaml \
  -f https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/examples/standard/deployment.yaml \
  -f https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/examples/standard/service.yaml
```

### Étape 5 : Déploiement des applications et du monitoring
```bash
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/order-api.yaml
kubectl apply -f k8s/order-worker.yaml
kubectl apply -f k8s/keda.yaml
kubectl apply -f k8s/monitoring.yaml
```

Vérifier que tous les pods sont prêts :
```bash
kubectl get pods -A
```

---

## 4. Accès aux Interfaces

- **API de commandes :** `http://localhost:30080` (NodePort direct)
- **Tableau de bord Grafana (pré-configuré et auto-provisionné) :**
  ```bash
  kubectl port-forward svc/grafana 3000:3000
  ```
  Accès : `http://localhost:3000` (identifiants par défaut : `admin` / `admin` ou accès anonyme activé).
- **Prometheus :**
  ```bash
  kubectl port-forward svc/prometheus 9090:9090
  ```
  Accès : `http://localhost:9090`.

---

## 5. Procédure de Démonstration (Pic de Charge et Scale-to-Zero)

1. Ouvrir un premier terminal pour observer l'état des pods workers :
   ```bash
   watch -n 1 kubectl get pods -l app=order-worker
   ```
   *Constat au repos : `No resources found` (0 worker alloué).*

2. Dans un second terminal, injecter une vague de 30 commandes :
   ```bash
   API_URL=http://localhost:30080 node scripts/simulate_orders.js 30 50
   ```

3. Comportement observé :
   - KEDA détecte la file et déclenche instantanément l'autoscaling des workers en parallèle.
   - Les workers dépilent les 30 commandes en quelques secondes.
   - Dès que la file est vide, une période de sécurité (cooldown de 15s) s'enclenche.
   - Les pods sont automatiquement détruits : retour à **0 pod**.

---

## 6. Documentation Complémentaire

- **Choix Techniques, Alternatives et Limites :** Voir [CHOIX_TECHNIQUES.md](CHOIX_TECHNIQUES.md).
