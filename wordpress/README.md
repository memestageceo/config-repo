# Deploy wordpress with kubernetes

- [x] create kind cluster
- [x] create namespace `wordpress`
- [x] create deployment and service for wordpress
- [] configure `extraPortMappings` in [](./kind-config.yaml)

`extraPortMappings` with `clusterip` does not expose the service. Earlier, gateway api was exposing the clusterip but we no longer have that in our cluster.

we can use nodeport or configure a load balancer, then the port mappings in kind configuration would work

---

Another dumb thing was `telescope neovim`. on double `leader`, it searches in rwd, so the cwd config wasn't the one i edited.

This resulted in hours wasted. THANKS!

```bash
├── kind-config.yaml # EDITED LIKE AN IDIOT
├── README.md
└── wordpress
    ├── compose.yaml
    ├── data
    ├── deploy.yaml
    ├── kind-config.yaml
    ├── kind2.yaml
    ├── ns.yaml
    └── README.md
```
