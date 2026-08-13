# Módulo Ferramentas Daemon, Contratos

## docker_status
Input: nenhum.
Output:
```json
{
  "status": "running",
  "version": { "engine", "api", "go", "os", "arch", "kernel", "build_time" },
  "system": { "hostname", "os", "os_type", "kernel", "architecture", "cpus", "memory_total_bytes", "docker_root_dir", "logging_driver", "cgroup_driver", "cgroup_version" },
  "containers": { "total", "running", "paused", "stopped" },
  "images": { "total" },
  "disk_usage": {
    "images": { "count", "total_size_bytes", "reclaimable_bytes" },
    "volumes": { "count", "total_size_bytes" },
    "build_cache": { "count", "total_size_bytes" }
  },
  "plugins": { "volume", "network", "log" },
  "swarm": { "active", "state" },
  "warnings": []
}
```

## Erro (formato padronizado — DT-ST)
`{content:[{type:"text", text:"Error docker_status: <msg>"}], isError:true}`.
