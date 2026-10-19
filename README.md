# Autoscale Orders (KEDA & Redis)

Projet de mise a l'echelle event-driven avec KEDA, Redis et Kubernetes.

## Prerequis

- Docker
- kind
- kubectl
- Node.js (v18+)

## 1. Demarrage du cluster et des services

Creer le cluster kind avec le mapping de port :
```bash
kind create cluster --name autoscale-cluster --config kind-config.yaml
```

Construire et charger les images locales dans kind :
```bash
docker build -t order-api:latest ./services/order-api
docker build -t order-worker:latest ./services/order-worker

kind load docker-image order-api:latest --name autoscale-cluster
kind load docker-image order-worker:latest --name autoscale-cluster
```

Installer KEDA :
```bash
kubectl apply --server-side -f https://github.com/kedacore/keda/releases/download/v2.14.0/keda-2.14.0.yaml
```

Installer kube-state-metrics :
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/examples/standard/service-account.yaml \
  -f https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/examples/standard/cluster-role.yaml \
  -f https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/examples/standard/cluster-role-binding.yaml \
  -f https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/examples/standard/deployment.yaml \
  -f https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/examples/standard/service.yaml
```

Deployer les services, KEDA et le monitoring :
```bash
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/order-api.yaml
kubectl apply -f k8s/order-worker.yaml
kubectl apply -f k8s/keda.yaml
kubectl apply -f k8s/monitoring.yaml
```

Verifier le statut des pods :
```bash
kubectl get pods -A
```

## 2. Acces aux interfaces

API des commandes :
- URL : http://localhost:30080

Grafana (tableau de bord pre-charge) :
```bash
kubectl port-forward svc/grafana 3000:3000
```
- URL : http://localhost:3000

Prometheus :
```bash
kubectl port-forward svc/prometheus 9090:9090
```
- URL : http://localhost:9090

## 3. Test de charge et Scale-to-Zero

Dans un terminal, observer les pods en temps reel :
```bash
watch kubectl get pods -l app=order-worker
```

Dans un autre terminal, injecter une vague de 30 commandes :
```bash
API_URL=http://localhost:30080 node scripts/simulate_orders.js 30 50
```

Comportement attendu :
- Au repos : 0 pod worker.
- Sous charge : KEDA scale automatiquement jusqu'a 8 pods.
- File vide : retour automatique a 0 pod apres 15 secondes de cooldown.
