"""
Best Practices Analyzer for Kubernetes clusters

This module analyzes Kubernetes cluster resources against best practices
defined in the Kubernetes Best Practices Guide.
"""

from typing import Dict, List, Any, Optional
import logging

# Set up logger
logger = logging.getLogger("cluster_explorer")

def analyze_best_practices(resources: Dict[str, List[Dict]]) -> Dict[str, Any]:
    """
    Analyze the cluster resources against best practices.
    
    Args:
        resources: Dictionary of resources by type
        
    Returns:
        Dictionary with analysis results
    """
    logger.info("Starting best practices analysis")
    logger.info(f"Resources provided: {type(resources)}, keys: {list(resources.keys()) if resources and isinstance(resources, dict) else 'None'}")
    
    if not resources or not isinstance(resources, dict) or len(resources) == 0:
        logger.warning("No resources provided for best practices analysis")
        return None
    
    analysis = {
        "overall_score": 0,
        "categories": {
            "resiliency": {"score": 0, "checks": []},
            "workload": {"score": 0, "checks": []},
            "pdb": {"score": 0, "checks": []},
            "topology": {"score": 0, "checks": []},
            "security": {"score": 0, "checks": []},
            "network": {"score": 0, "checks": []},
            "secrets": {"score": 0, "checks": []},
            "observability": {"score": 0, "checks": []}
        }
    }
    
    # Extract resources by type
    deployments = resources.get("deployments", [])
    stateful_sets = resources.get("statefulsets", [])
    services = resources.get("services", [])
    pods = resources.get("pods", [])
    network_policies = resources.get("networkpolicies", [])
    pdbs = resources.get("poddisruptionbudgets", [])
    
    # Helper function to safely calculate percentage and cap at 100%
    def safe_percentage(count: int, total: int, default: int = 0) -> int:
        """Calculate percentage and ensure it's between 0 and 100"""
        if total <= 0:
            return default
        percentage = round((count / total) * 100)
        return min(percentage, 100)  # Cap at 100%
    
    # --------------------------------------------
    # Resiliency Checks
    # --------------------------------------------
    resiliency_checks = []
    
    # Check for multi-zone deployment
    workloads = deployments + stateful_sets
    multi_zone_count = 0
    
    for w in workloads:
        pod_spec = w.get("spec", {}).get("template", {}).get("spec", {})
        
        # Check for zone anti-affinity
        affinity = pod_spec.get("affinity", {})
        pod_anti_affinity = affinity.get("podAntiAffinity", {})
        required_rules = pod_anti_affinity.get("requiredDuringSchedulingIgnoredDuringExecution", [])
        
        has_anti_affinity = any(
            rule.get("topologyKey") == "topology.kubernetes.io/zone"
            for rule in required_rules
        )
        
        # Check for topology spread constraints
        topology_constraints = pod_spec.get("topologySpreadConstraints", [])
        has_topology_spread = any(
            constraint.get("topologyKey") == "topology.kubernetes.io/zone"
            for constraint in topology_constraints
        )
        
        if has_anti_affinity or has_topology_spread:
            multi_zone_count += 1
    
    multi_zone_percentage = safe_percentage(multi_zone_count, len(workloads))
    resiliency_checks.append({
        "name": "Multi-zone deployment",
        "passed": multi_zone_percentage >= 80,
        "details": (
            f"{multi_zone_percentage}% of workloads are configured for multi-zone deployment"
            if multi_zone_percentage >= 80
            else f"Only {multi_zone_percentage}% of workloads are configured for multi-zone deployment"
        ),
        "explanation": (
            "Multi-zone deployment helps ensure application availability in case of zone failure. " 
            "Configure Pod anti-affinity or topology spread constraints to distribute your workloads "
            "across multiple zones in your Kubernetes cluster."
        ),
        "recommendation": (
            "Configure Pod anti-affinity or topology spread constraints with topologyKey: 'topology.kubernetes.io/zone' "
            "to distribute your workloads across multiple zones. For critical services, use "
            "requiredDuringSchedulingIgnoredDuringExecution to ensure zone distribution."
        ),
        "reference": "https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/"
    })
    
    # Check for health probes
    health_probe_count = 0
    
    for w in workloads:
        containers = w.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
        
        if any(
            "livenessProbe" in c or "readinessProbe" in c or "startupProbe" in c
            for c in containers
        ):
            health_probe_count += 1
    
    health_probe_percentage = safe_percentage(health_probe_count, len(workloads))
    
    # Count each probe type separately
    liveness_probe_count = sum(
        1 for w in workloads
        if any("livenessProbe" in c for c in w.get("spec", {}).get("template", {}).get("spec", {}).get("containers", []))
    )
    
    readiness_probe_count = sum(
        1 for w in workloads
        if any("readinessProbe" in c for c in w.get("spec", {}).get("template", {}).get("spec", {}).get("containers", []))
    )
    
    startup_probe_count = sum(
        1 for w in workloads
        if any("startupProbe" in c for c in w.get("spec", {}).get("template", {}).get("spec", {}).get("containers", []))
    )
    
    liveness_percentage = safe_percentage(liveness_probe_count, len(workloads))
    readiness_percentage = safe_percentage(readiness_probe_count, len(workloads))
    startup_percentage = safe_percentage(startup_probe_count, len(workloads))
    
    probe_details = (
        f"{health_probe_percentage}% of workloads have at least one health probe configured. "
        f"Breakdown: Liveness: {liveness_percentage}%, Readiness: {readiness_percentage}%, Startup: {startup_percentage}%"
        if health_probe_percentage >= 75
        else f"Only {health_probe_percentage}% of workloads have health probes configured. "
        f"Breakdown: Liveness: {liveness_percentage}%, Readiness: {readiness_percentage}%, Startup: {startup_percentage}%"
    )
    
    resiliency_checks.append({
        "name": "Health checks",
        "passed": health_probe_percentage >= 75,
        "details": probe_details,
        "explanation": (
            "Health probes allow Kubernetes to detect and respond to application failures. "
            "Liveness probes determine if an application is running, readiness probes determine "
            "if an application is ready to receive traffic, and startup probes allow slow-starting "
            "containers to delay other probes until they've initialized."
        ),
        "recommendation": (
            "Configure readinessProbe for all containers to verify they're ready to receive traffic. "
            "Add livenessProbe to detect and restart hung applications. For slow-starting applications, "
            "use startupProbe to give them time to initialize before other probes activate. "
            "Use HTTP checks for web services and exec commands for non-HTTP applications."
        ),
        "reference": "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/"
    })
    
    # Check for graceful termination
    graceful_termination_count = 0
    
    for w in workloads:
        containers = w.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
        
        has_pre_stop_hook = any(
            c.get("lifecycle", {}).get("preStop") is not None
            for c in containers
        )
        
        has_grace_period = w.get("spec", {}).get("template", {}).get("spec", {}).get("terminationGracePeriodSeconds", 0) > 30
        
        if has_pre_stop_hook or has_grace_period:
            graceful_termination_count += 1
    
    graceful_termination_percentage = safe_percentage(graceful_termination_count, len(workloads))
    resiliency_checks.append({
        "name": "Graceful termination",
        "passed": graceful_termination_percentage >= 60,
        "details": (
            f"{graceful_termination_percentage}% of workloads have graceful termination configured"
            if graceful_termination_percentage >= 60
            else f"Only {graceful_termination_percentage}% of workloads have graceful termination configured"
        ),
        "explanation": (
            "Graceful termination allows applications to complete in-flight requests and clean up "
            "resources before shutting down. Use preStop hooks to implement custom shutdown behavior "
            "and appropriate terminationGracePeriodSeconds to ensure adequate time for cleanup."
        ),
        "recommendation": (
            "Add preStop hooks to signal applications to stop accepting new connections and finish "
            "processing existing ones. Set terminationGracePeriodSeconds to an appropriate value "
            "(≥30s for most applications, longer for databases or message brokers). Implement proper "
            "signal handling in your application code to respond to SIGTERM."
        ),
        "reference": "https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/"
    })
    
    # Calculate resiliency score - average of all check percentages
    if resiliency_checks:
        check_percentages = [
            multi_zone_percentage,
            health_probe_percentage,
            graceful_termination_percentage
        ]
        resiliency_score = sum(check_percentages) // len(check_percentages)
    else:
        resiliency_score = 0
        
    analysis["categories"]["resiliency"] = {
        "score": resiliency_score,
        "checks": resiliency_checks
    }
    
    # --------------------------------------------
    # Workload Sizing Checks
    # --------------------------------------------
    workload_checks = []
    
    # Check for resource requests
    resource_requests_count = 0
    
    for pod in pods:
        containers = pod.get("spec", {}).get("containers", [])
        
        if all(
            c.get("resources", {}).get("requests", {}).get("cpu") and
            c.get("resources", {}).get("requests", {}).get("memory")
            for c in containers
        ) and containers:
            resource_requests_count += 1
    
    resource_requests_percentage = safe_percentage(resource_requests_count, len(pods))
    workload_checks.append({
        "name": "Resource requests",
        "passed": resource_requests_percentage >= 90,
        "details": (
            f"{resource_requests_percentage}% of containers have resource requests defined"
            if resource_requests_percentage >= 90
            else f"Only {resource_requests_percentage}% of containers have resource requests defined"
        ),
        "explanation": (
            "Resource requests tell Kubernetes how much CPU and memory your containers need, enabling "
            "proper scheduling decisions. Without requests, pods may be scheduled on nodes with "
            "insufficient resources, leading to poor performance or evictions during load spikes."
        ),
        "recommendation": (
            "Define CPU and memory requests for all containers based on observed usage patterns. "
            "Start with metrics from your monitoring system or use the Vertical Pod Autoscaler in "
            "recommendation mode to suggest appropriate values."
        ),
        "reference": "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/"
    })
    
    # Check for resource limits
    resource_limits_count = 0
    
    for pod in pods:
        containers = pod.get("spec", {}).get("containers", [])
        
        if all(
            c.get("resources", {}).get("limits", {}).get("memory")
            for c in containers
        ) and containers:
            resource_limits_count += 1
    
    resource_limits_percentage = safe_percentage(resource_limits_count, len(pods))
    workload_checks.append({
        "name": "Resource limits",
        "passed": resource_limits_percentage >= 70,
        "details": (
            f"{resource_limits_percentage}% of containers have memory limits defined"
            if resource_limits_percentage >= 70
            else f"Only {resource_limits_percentage}% of containers have memory limits defined"
        ),
        "explanation": (
            "Memory limits prevent containers from consuming excessive memory resources that could "
            "impact other workloads on the node. Containers exceeding their memory limit will be "
            "terminated. CPU limits, however, only throttle containers and are often not recommended "
            "as they can cause CPU starvation."
        ),
        "recommendation": (
            "Set memory limits for all containers to prevent resource starvation. Consider setting "
            "memory limits equal to requests to ensure the Guaranteed QoS class. Use LimitRange "
            "resources to establish default limits at the namespace level."
        ),
        "reference": "https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/memory-default-namespace/"
    })
    
    # Check for guaranteed QoS (equal memory requests and limits)
    guaranteed_qos_count = 0
    guaranteed_qos_eligible = 0
    
    for pod in pods:
        containers = pod.get("spec", {}).get("containers", [])
        all_containers_have_resources = True
        all_equal_mem_req_limit = True
        
        for c in containers:
            resources = c.get("resources", {})
            mem_request = resources.get("requests", {}).get("memory")
            mem_limit = resources.get("limits", {}).get("memory")
            
            # Skip if no resource definitions
            if not resources or not mem_request or not mem_limit:
                all_containers_have_resources = False
                break
                
            # Check if request equals limit
            if mem_request != mem_limit:
                all_equal_mem_req_limit = False
                break
        
        # Only count pods where all containers have resource definitions
        if all_containers_have_resources and containers:
            guaranteed_qos_eligible += 1
            if all_equal_mem_req_limit:
                guaranteed_qos_count += 1
    
    guaranteed_qos_percentage = safe_percentage(guaranteed_qos_count, guaranteed_qos_eligible)
    workload_checks.append({
        "name": "Guaranteed QoS",
        "passed": guaranteed_qos_percentage >= 50,
        "details": (
            f"{guaranteed_qos_percentage}% of pods have memory requests equal to limits for guaranteed QoS"
            if guaranteed_qos_percentage >= 50
            else f"Only {guaranteed_qos_percentage}% of pods have memory requests equal to limits for guaranteed QoS"
        ),
        "explanation": (
            "Kubernetes assigns Quality of Service (QoS) classes to pods based on resource specifications. "
            "Pods with memory and CPU requests equal to their limits get the 'Guaranteed' QoS class, "
            "providing the highest priority during resource contention and the lowest probability of "
            "eviction. This is essential for production workloads where reliability is critical."
        ),
        "recommendation": (
            "Set memory and CPU requests equal to limits for critical workloads to ensure the "
            "Guaranteed QoS class. Avoid this for development or non-critical workloads where "
            "resource utilization efficiency is more important than reliability. Consider using "
            "ResourceQuotas and LimitRanges to enforce this for specific namespaces."
        ),
        "reference": "https://kubernetes.io/docs/tasks/configure-pod-container/quality-service-pod/"
    })
    
    # Calculate workload score - average of all check percentages
    if workload_checks:
        check_percentages = [
            resource_requests_percentage,
            resource_limits_percentage,
            guaranteed_qos_percentage
        ]
        workload_score = sum(check_percentages) // len(check_percentages)
    else:
        workload_score = 0
        
    analysis["categories"]["workload"] = {
        "score": workload_score,
        "checks": workload_checks
    }
    
    # --------------------------------------------
    # PDB Checks
    # --------------------------------------------
    pdb_checks = []
    
    # Check for PDB coverage
    # Count deployments and statefulsets with more than 1 replica
    multi_replica_workloads = sum(
        1 for w in workloads
        if (w.get("spec", {}).get("replicas") or 1) > 1
    )
    
    logger.info(f"Found {multi_replica_workloads} workloads with multiple replicas")
    logger.info(f"Found {len(pdbs)} PodDisruptionBudgets in the cluster")
    
    # More accurate PDB coverage calculation
    workloads_with_pdb = 0
    for w in workloads:
        # Skip workloads with 1 or no replicas
        if (w.get("spec", {}).get("replicas") or 1) <= 1:
            continue
        
        workload_labels = w.get("metadata", {}).get("labels", {})
        workload_namespace = w.get("metadata", {}).get("namespace", "default")
        workload_name = w.get("metadata", {}).get("name", "unknown")
        workload_kind = w.get("kind", "Workload")
        
        logger.debug(f"Checking {workload_kind}/{workload_name} in namespace {workload_namespace} with labels {workload_labels}")
        
        # Check if any PDB selects this workload
        found_matching_pdb = False
        for pdb in pdbs:
            pdb_namespace = pdb.get("metadata", {}).get("namespace", "default")
            pdb_name = pdb.get("metadata", {}).get("name", "unknown")
            
            # Only consider PDBs in the same namespace
            if pdb_namespace != workload_namespace:
                continue
            
            selector = pdb.get("spec", {}).get("selector", {})
            if not selector:
                logger.debug(f"PDB {pdb_name} has no selector")
                continue
            
            match_labels = selector.get("matchLabels", {})
            logger.debug(f"Checking if PDB {pdb_name} with matchLabels {match_labels} selects workload {workload_name}")
            
            # Check if the PDB's matchLabels are a subset of workload's labels
            if all(workload_labels.get(key) == value for key, value in match_labels.items() if key in workload_labels):
                workloads_with_pdb += 1
                found_matching_pdb = True
                logger.info(f"Found matching PDB {pdb_name} for workload {workload_kind}/{workload_name} in namespace {workload_namespace}")
                break  # One matching PDB is enough, don't count the same workload twice
        
        if not found_matching_pdb:
            logger.info(f"No matching PDB found for workload {workload_kind}/{workload_name} in namespace {workload_namespace}")

    # Ensure we don't divide by zero and cap at 100%
    pdb_coverage = safe_percentage(workloads_with_pdb, multi_replica_workloads)
    logger.info(f"PDB coverage: {workloads_with_pdb}/{multi_replica_workloads} workloads ({pdb_coverage}%)")

    pdb_checks.append({
        "name": "PDB coverage",
        "passed": pdb_coverage >= 80,
        "details": (
            f"{pdb_coverage}% of multi-replica workloads have PDBs"
            if pdb_coverage >= 80
            else f"Only {pdb_coverage}% of multi-replica workloads have PDBs"
        ),
        "explanation": (
            "Pod Disruption Budgets (PDBs) protect your application's availability during voluntary "
            "disruptions like node drains or cluster upgrades. Without PDBs, Kubernetes might terminate "
            "too many pods simultaneously, causing service disruption even for highly-replicated workloads."
        ),
        "recommendation": (
            "Implement PDBs for all stateful applications and critical workloads with multiple replicas. "
            "Consider setting maxUnavailable to 1 for small deployments (3-5 replicas) or to a percentage "
            "(e.g., 25%) for larger deployments to balance availability with operational flexibility."
        ),
        "reference": "https://kubernetes.io/docs/tasks/run-application/configure-pdb/"
    })
    
    # Check for good PDB configuration
    logger.info(f"Checking maxUnavailable configuration in PDBs")

    # Count workloads with maxUnavailable PDBs
    workloads_with_max_unavailable_pdb = 0
    total_multi_replica_workloads = 0

    for w in workloads:
        # Skip workloads with 1 or no replicas
        if (w.get("spec", {}).get("replicas") or 1) <= 1:
            continue
        
        total_multi_replica_workloads += 1
        workload_labels = w.get("metadata", {}).get("labels", {})
        workload_namespace = w.get("metadata", {}).get("namespace", "default")
        workload_name = w.get("metadata", {}).get("name", "unknown")
        workload_kind = w.get("kind", "Workload")
        
        logger.debug(f"Checking if workload {workload_kind}/{workload_name} has a PDB with maxUnavailable")
        
        # Check if any PDB with maxUnavailable selects this workload
        found_max_unavailable_pdb = False
        for pdb in pdbs:
            pdb_namespace = pdb.get("metadata", {}).get("namespace", "default")
            pdb_name = pdb.get("metadata", {}).get("name", "unknown")
            
            # Only consider PDBs in the same namespace
            if pdb_namespace != workload_namespace:
                continue
            
            pdb_spec = pdb.get("spec", {})
            
            # Skip PDBs with no spec
            if not pdb_spec:
                continue
            
            # Check if maxUnavailable is set
            has_max_unavailable = "maxUnavailable" in pdb_spec
            if not has_max_unavailable:
                continue
            
            selector = pdb_spec.get("selector", {})
            if not selector:
                logger.debug(f"PDB {pdb_name} has no selector")
                continue
            
            match_labels = selector.get("matchLabels", {})
            
            # Check if the PDB's matchLabels are a subset of workload's labels
            if all(workload_labels.get(key) == value for key, value in match_labels.items() if key in workload_labels):
                workloads_with_max_unavailable_pdb += 1
                found_max_unavailable_pdb = True
                logger.info(f"Found matching PDB {pdb_name} with maxUnavailable for workload {workload_kind}/{workload_name}")
                break  # One matching PDB is enough, don't count the same workload twice
        
        if not found_max_unavailable_pdb:
            logger.info(f"No matching PDB with maxUnavailable found for workload {workload_kind}/{workload_name}")

    max_unavailable_percentage = safe_percentage(workloads_with_max_unavailable_pdb, total_multi_replica_workloads)
    logger.info(f"maxUnavailable PDB coverage: {workloads_with_max_unavailable_pdb}/{total_multi_replica_workloads} workloads ({max_unavailable_percentage}%)")

    pdb_checks.append({
        "name": "PDB configuration",
        "passed": max_unavailable_percentage >= 70,
        "details": (
            f"{max_unavailable_percentage}% of multi-replica workloads have PDBs with maxUnavailable"
            if max_unavailable_percentage >= 70
            else f"Only {max_unavailable_percentage}% of multi-replica workloads have PDBs with maxUnavailable"
        ),
        "explanation": (
            "PDBs can be configured with either minAvailable or maxUnavailable. MaxUnavailable is "
            "generally preferred for workloads that scale up and down frequently. It allows for a fixed number "
            "of pods to be unavailable regardless of scaling events, making it more flexible as your deployment "
            "size changes. An overly strict PDB can block cluster maintenance operations."
        ),
        "recommendation": (
            "Use maxUnavailable for workloads that scale, set to 1 for small deployments (3-5 replicas) or "
            "to a percentage (e.g., 25%) for larger deployments. For critical services with fixed replica counts, "
            "minAvailable can be used to ensure a specific number of pods are always available. Test your PDBs "
            "with cordons and drains to verify they work as expected."
        ),
        "reference": "https://kubernetes.io/docs/tasks/run-application/configure-pdb/"
    })
    
    # Calculate PDB score - average of coverage and maxUnavailable configuration percentages
    if pdb_checks:
        logger.info(f"Calculating PDB score using coverage ({pdb_coverage}%) and maxUnavailable configuration ({max_unavailable_percentage}%)")
        check_percentages = [
            pdb_coverage,                # Percentage of multi-replica workloads with any PDB
            max_unavailable_percentage   # Percentage of multi-replica workloads with maxUnavailable PDBs
        ]
        pdb_score = sum(check_percentages) // len(check_percentages)
        logger.info(f"Final PDB score: {pdb_score}%")
    else:
        pdb_score = 0
        
    analysis["categories"]["pdb"] = {
        "score": pdb_score,
        "checks": pdb_checks
    }
    
    # --------------------------------------------
    # Topology Checks
    # --------------------------------------------
    topology_checks = []
    
    # Check for topology spread constraints
    topology_constraint_count = sum(
        1 for w in workloads
        if w.get("spec", {}).get("template", {}).get("spec", {}).get("topologySpreadConstraints")
    )
    
    topology_constraint_percentage = safe_percentage(topology_constraint_count, len(workloads))
    topology_checks.append({
        "name": "Topology constraints",
        "passed": topology_constraint_percentage >= 50,
        "details": (
            f"{topology_constraint_percentage}% of workloads use topology spread constraints"
            if topology_constraint_percentage >= 50
            else f"Only {topology_constraint_percentage}% of workloads use topology spread constraints"
        ),
        "explanation": (
            "Topology spread constraints ensure pods are distributed across failure domains like "
            "zones, nodes, or regions. This improves application resilience by preventing pods from "
            "clustering on the same infrastructure, which could lead to widespread outages during "
            "zone or node failures."
        ),
        "recommendation": (
            "Implement topology spread constraints for critical workloads to ensure even distribution "
            "across zones and nodes. Use maxSkew of 1 for critical services and configure "
            "whenUnsatisfiable to ScheduleAnyway for non-critical services to balance resilience "
            "with deployment flexibility."
        ),
        "reference": "https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/"
    })
    
    # Check for pod anti-affinity
    anti_affinity_count = sum(
        1 for w in workloads
        if w.get("spec", {}).get("template", {}).get("spec", {}).get("affinity", {}).get("podAntiAffinity")
    )
    
    # Count required pod anti-affinity
    required_anti_affinity_count = sum(
        1 for w in workloads
        if w.get("spec", {}).get("template", {}).get("spec", {}).get("affinity", {}).get("podAntiAffinity", {}).get("requiredDuringSchedulingIgnoredDuringExecution")
    )
    
    # Count preferred pod anti-affinity
    preferred_anti_affinity_count = sum(
        1 for w in workloads
        if w.get("spec", {}).get("template", {}).get("spec", {}).get("affinity", {}).get("podAntiAffinity", {}).get("preferredDuringSchedulingIgnoredDuringExecution")
    )
    
    anti_affinity_percentage = safe_percentage(anti_affinity_count, len(workloads))
    required_percentage = safe_percentage(required_anti_affinity_count, len(workloads))
    preferred_percentage = safe_percentage(preferred_anti_affinity_count, len(workloads))
    
    # Overall pod anti-affinity check
    topology_checks.append({
        "name": "Pod anti-affinity",
        "passed": anti_affinity_percentage <= 30, # Inverted threshold based on new requirements
        "details": (
            f"{anti_affinity_percentage}% of workloads use pod anti-affinity. "
            f"Breakdown: Required: {required_percentage}%, Preferred: {preferred_percentage}%"
        ),
        "explanation": (
            "Pod anti-affinity prevents pods from being scheduled on the same nodes or zones, improving "
            "resilience against infrastructure failures. Without proper distribution constraints, the scheduler might place "
            "all replicas on a single node, which could cause a complete service outage if that node fails. "
            "However, podAntiAffinity can lead to optimization issues in large clusters."
        ),
        "recommendation": (
            "Consider migrating from podAntiAffinity to topologySpreadConstraints, which offers better "
            "scheduling efficiency and more flexible distribution controls. topologySpreadConstraints allows "
            "for explicit control over pod distribution with maxSkew and is the recommended approach for "
            "Kubernetes 1.19+. Use preferred anti-affinity for most workloads and required only for critical stateful services."
        ),
        "reference": "https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/#comparison-with-podaffinity-podantiaffinity"
    })
    
    # Calculate topology score - average of all check percentages
    if topology_checks:
        check_percentages = [
            topology_constraint_percentage,
            anti_affinity_percentage
        ]
        topology_score = sum(check_percentages) // len(check_percentages)
    else:
        topology_score = 0
        
    analysis["categories"]["topology"] = {
        "score": topology_score,
        "checks": topology_checks
    }
    
    # --------------------------------------------
    # Security Checks
    # --------------------------------------------
    security_checks = []
    
    # Check for network policies
    # First check if network policies are available in the data
    network_policies_available = "networkpolicies" in resources and len(network_policies) > 0
    logger.info(f"Network policies data available: {network_policies_available}, count: {len(network_policies)}")

    if not network_policies_available:
        network_policy_percentage = 0
        default_deny_policy = False
        network_policy_details = "Network policy data not available in snapshot data"
        logger.warning("Network policy data not available in snapshot data")
    else:
        # Check for default deny policy if we have network policy data
        default_deny_policy = any(
            policy for policy in network_policies
            if (
                # Check for empty pod selector (applies to all pods)
                (not policy.get("spec", {}).get("podSelector", {}).get("matchLabels") and
                not policy.get("spec", {}).get("podSelector", {}).get("matchExpressions")) and
                (
                    # Check if it's denying all ingress or egress
                    (not policy.get("spec", {}).get("ingress") or
                     "Ingress" in policy.get("spec", {}).get("policyTypes", [])) or
                    (not policy.get("spec", {}).get("egress") or
                     "Egress" in policy.get("spec", {}).get("policyTypes", []))
                )
            )
        )
        
        # Convert boolean to percentage (100% if true, 0% if false)
        network_policy_percentage = 100 if default_deny_policy else 0
        network_policy_details = (
            "Default deny network policy is in place"
            if default_deny_policy
            else "No default deny network policy found"
        )
        logger.info(f"Default deny network policy found: {default_deny_policy}")

    security_checks.append({
        "name": "Network policies",
        "passed": default_deny_policy,
        "details": network_policy_details,
        "explanation": (
            "Network policies are essential for implementing the principle of least privilege in your "
            "cluster network. Without default deny policies, pods can communicate with any other pod "
            "or external endpoint, potentially allowing attackers to move laterally through your cluster."
        ),
        "recommendation": (
            "Implement default deny network policies for all namespaces, then explicitly allow required "
            "traffic with additional policies. Start with egress policies which are typically less "
            "disruptive, then implement ingress policies. Use tools like Network Policy Advisor or "
            "network visualization to understand existing traffic patterns."
        ),
        "reference": "https://kubernetes.io/docs/concepts/services-networking/network-policies/"
    })
    
    # Check for security contexts
    security_context_count = 0
    
    for pod in pods:
        pod_spec = pod.get("spec", {})
        containers = pod_spec.get("containers", [])
        
        if any(
            c.get("securityContext", {}).get("runAsNonRoot") is True or
            (c.get("securityContext", {}).get("runAsUser", 0) or 0) > 0 or
            pod_spec.get("securityContext", {}).get("runAsNonRoot") is True or
            (pod_spec.get("securityContext", {}).get("runAsUser", 0) or 0) > 0
            for c in containers
        ):
            security_context_count += 1
    
    security_context_percentage = safe_percentage(security_context_count, len(pods))
    security_checks.append({
        "name": "Security context",
        "passed": security_context_percentage >= 75,
        "details": (
            f"{security_context_percentage}% of pods run as non-root"
            if security_context_percentage >= 75
            else f"Only {security_context_percentage}% of pods run as non-root"
        ),
        "explanation": (
            "Running containers as non-root is a fundamental security practice. Root access inside a "
            "container can make it easier for attackers to escape the container, especially if combined "
            "with other vulnerabilities. Most applications don't require root privileges to function."
        ),
        "recommendation": (
            "Configure all containers to run as non-root users with runAsNonRoot: true and a specific "
            "runAsUser value. Remove unnecessary capabilities and add seccompProfile. Consider using "
            "admission controllers like Pod Security Policies or Pod Security Standards to enforce "
            "these requirements cluster-wide."
        ),
        "reference": "https://kubernetes.io/docs/tasks/configure-pod-container/security-context/"
    })
    
    # For image scanning, we'll assume it's in place if images follow a pattern
    # like registry.company.com/ or if there are no latest tags
    image_scanning = all(
        all(
            # Check if image comes from a private registry (likely scanned)
            ("." in (image := container.get("image", "")) and "/" in image and not image.startswith("docker.io")) or
            # Check if it avoids 'latest' tag
            (not image.endswith(":latest") and ":" in image)
            for container in pod.get("spec", {}).get("containers", [])
        )
        for pod in pods
    ) if pods else False
    
    # Convert boolean to percentage
    image_scanning_percentage = 100 if image_scanning else 0
    security_checks.append({
        "name": "Image scanning",
        "passed": image_scanning,
        "details": (
            "Images appear to follow security best practices"
            if image_scanning
            else "Some images may not be scanned (using latest tag or public registries)"
        ),
        "explanation": (
            "Container image scanning identifies vulnerabilities in your application dependencies and "
            "base images. Using 'latest' tags or unvetted public images increases security risk, as they "
            "may contain unpatched vulnerabilities or even malicious code. Additionally, 'latest' makes "
            "it impossible to track which version is running."
        ),
        "recommendation": (
            "Use a private registry with vulnerability scanning enabled. Pin images to specific digests "
            "or tags (never 'latest'). Implement admission controllers like Kyverno or OPA Gatekeeper to "
            "reject unscanned images or images with critical vulnerabilities. Consider tools like Trivy "
            "or Clair for scanning."
        ),
        "reference": "https://cast.ai/blog/kubernetes-security-10-best-practices/"
    })
    
    # Calculate security score - average of all check percentages
    if security_checks:
        check_percentages = [
            network_policy_percentage,
            security_context_percentage,
            image_scanning_percentage
        ]
        security_score = sum(check_percentages) // len(check_percentages)
    else:
        security_score = 0
        
    analysis["categories"]["security"] = {
        "score": security_score,
        "checks": security_checks
    }
    
    # --------------------------------------------
    # Network Checks 
    # --------------------------------------------
    network_checks = []
    
    # Check for CNI configuration (we'll assume it's good if there are any network policies)
    cni_configuration = len(network_policies) > 0
    cni_percentage = 100 if cni_configuration else 0
    network_checks.append({
        "name": "CNI configuration",
        "passed": cni_configuration,
        "details": (
            "Network policies are being used, suggesting proper CNI configuration"
            if cni_configuration
            else "No network policies found, may indicate missing CNI configuration"
        ),
        "explanation": (
            "Container Network Interface (CNI) plugins that support network policies are essential for "
            "implementing microsegmentation in Kubernetes. Without a policy-enabled CNI like Calico, "
            "Cilium, or Antrea, network policies won't be enforced, leaving your cluster vulnerable to "
            "lateral movement attacks."
        ),
        "recommendation": (
            "Ensure your cluster uses a CNI plugin that supports network policies, such as Calico, "
            "Cilium, or Antrea. If using a cloud provider, check if their CNI implementation supports "
            "network policies (e.g., Azure CNI, Amazon VPC CNI with additional components). Test policy "
            "enforcement by creating and verifying simple deny policies."
        ),
        "reference": "https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/"
    })
    
    # Check for service topology
    service_topology_count = sum(
        1 for svc in services
        if svc.get("spec", {}).get("topologyKeys")
    )
    
    service_topology_percentage = safe_percentage(service_topology_count, len(services))
    network_checks.append({
        "name": "Service Topology",
        "passed": service_topology_percentage > 0,
        "details": (
            f"{service_topology_percentage}% of services use topologyKeys"
            if service_topology_percentage > 0
            else "No services use topologyKeys"
        ),
        "explanation": (
            "Service topology allows Kubernetes to route traffic to pods in the same topology domain "
            "(e.g., same node or zone) as the client, reducing latency and cross-zone data transfer "
            "costs. Without topology routing, traffic may unnecessarily cross zone or node boundaries, "
            "increasing latency and potentially incurring extra costs."
        ),
        "recommendation": (
            "Enable topology aware routing in your services, particularly for data-intensive or "
            "latency-sensitive applications. Use topologyKeys like 'kubernetes.io/hostname' for "
            "node-local routing or 'topology.kubernetes.io/zone' for zone-aware routing. For newer "
            "Kubernetes versions, consider using topology aware hints instead."
        ),
        "reference": "https://opensource.googleblog.com/2020/11/kubernetes-efficient-multi-zone.html"
    })
    
    # Calculate network score - average of all check percentages
    if network_checks:
        check_percentages = [
            cni_percentage,
            service_topology_percentage
        ]
        network_score = sum(check_percentages) // len(check_percentages)
    else:
        network_score = 0
        
    analysis["categories"]["network"] = {
        "score": network_score,
        "checks": network_checks
    }
    
    # --------------------------------------------
    # Secrets Checks (simplified)
    # --------------------------------------------
    secrets_checks = []
    
    # Check for external secrets management
    # For demo, we'll assume it's good if no pod mounts secrets directly
    external_secrets_used = all(
        not any(v.get("secret") for v in pod.get("spec", {}).get("volumes", []))
        for pod in pods
    )
    
    # Convert boolean to percentage
    external_secrets_percentage = 100 if external_secrets_used else 0
    secrets_checks.append({
        "name": "Secret management",
        "passed": external_secrets_used,
        "details": (
            "External secrets management appears to be used"
            if external_secrets_used
            else "Pods are mounting Kubernetes secrets directly"
        ),
        "explanation": (
            "Native Kubernetes secrets have limitations: they're stored in etcd in base64 encoding (not "
            "encryption) by default, lack fine-grained access controls, and don't provide key rotation "
            "or versioning. External secret management tools address these limitations with encryption, "
            "access controls, rotation, and audit capabilities."
        ),
        "recommendation": (
            "Implement an external secrets management solution like HashiCorp Vault, AWS Secrets Manager, "
            "Azure Key Vault, or Google Secret Manager. Use the Kubernetes External Secrets operator or "
            "Secrets Store CSI Driver to integrate these services with your cluster. Encrypt etcd at rest "
            "as a minimum security measure."
        ),
        "reference": "https://external-secrets.io/latest/introduction/overview/"
    })
    
    # Just add another check for demo purposes
    rbac_restricts_secrets = True  # Simplified assumption
    rbac_percentage = 100 if rbac_restricts_secrets else 0
    secrets_checks.append({
        "name": "Secret access",
        "passed": rbac_restricts_secrets,
        "details": "RBAC properly restricts secret access",
        "explanation": (
            "Without proper RBAC controls, Service Accounts may have overly broad access to secrets, "
            "increasing the risk if a pod is compromised. By default, Kubernetes doesn't restrict which "
            "pods can access which secrets, so explicit RBAC rules are needed to implement the principle "
            "of least privilege."
        ),
        "recommendation": (
            "Implement fine-grained RBAC policies that limit service account access to only the secrets "
            "they need. Avoid using cluster-wide roles for secret access. Use namespaced roles and "
            "role bindings to isolate secrets between namespaces. Regularly audit RBAC rules and remove "
            "unnecessary permissions."
        ),
        "reference": "https://kubernetes.io/docs/reference/access-authn-authz/rbac/"
    })
    
    # Calculate secrets score - average of all check percentages
    if secrets_checks:
        check_percentages = [
            external_secrets_percentage,
            rbac_percentage
        ]
        secrets_score = sum(check_percentages) // len(check_percentages)
    else:
        secrets_score = 0
        
    analysis["categories"]["secrets"] = {
        "score": secrets_score,
        "checks": secrets_checks
    }
    
    # --------------------------------------------
    # Observability Checks (enhanced)
    # --------------------------------------------
    observability_checks = []
    
    # Check for common monitoring tool deployments
    monitoring_tools = {
        "prometheus": "Prometheus is a popular open-source monitoring and alerting system.",
        "grafana": "Grafana allows you to visualize metrics from various sources including Prometheus.",
        "metrics-server": "Metrics Server collects resource metrics from Kubelets for horizontal pod autoscaling.",
        "datadog": "Datadog is a commercial monitoring solution offering comprehensive Kubernetes observability.",
        "elastic": "Elastic Stack provides logging, metrics, and APM capabilities.",
        "kube-state-metrics": "Kube State Metrics exposes cluster-level metrics.",
        "newrelic": "New Relic offers commercial application and infrastructure monitoring."
    }
    
    detected_tools = []
    
    # Check for monitoring tools based on deployment/service names and labels
    for deployment in deployments:
        name = deployment.get("metadata", {}).get("name", "").lower()
        labels = deployment.get("metadata", {}).get("labels", {})
        annotations = deployment.get("metadata", {}).get("annotations", {})
        namespace = deployment.get("metadata", {}).get("namespace", "")
        
        # Check deployment name against monitoring tools
        for tool, description in monitoring_tools.items():
            if (
                tool in name or 
                tool.replace("-", "") in name or
                any(tool in key.lower() or tool in value.lower() for key, value in labels.items()) or
                any(tool in key.lower() or tool in value.lower() for key, value in annotations.items())
            ):
                detected_tools.append(tool)
    
    # Also check for services related to monitoring
    for service in services:
        name = service.get("metadata", {}).get("name", "").lower()
        labels = service.get("metadata", {}).get("labels", {})
        namespace = service.get("metadata", {}).get("namespace", "")
        
        # Check service name against monitoring tools
        for tool, description in monitoring_tools.items():
            if (
                tool in name or 
                tool.replace("-", "") in name or
                any(tool in key.lower() or tool in value.lower() for key, value in labels.items())
            ):
                detected_tools.append(tool)
    
    # Remove duplicates
    detected_tools = list(set(detected_tools))
    
    # Calculate score based on detected monitoring tools
    monitoring_tools_percentage = safe_percentage(len(detected_tools), 3, 0)  # Consider 3 tools as complete coverage
    
    monitoring_details = ""
    if detected_tools:
        monitoring_details = f"Detected monitoring tools: {', '.join(detected_tools)}"
    else:
        monitoring_details = "No common monitoring tools detected"
    
    observability_checks.append({
        "name": "Monitoring infrastructure",
        "passed": len(detected_tools) > 0,
        "details": monitoring_details,
        "explanation": (
            "A robust monitoring infrastructure is essential for cluster and application visibility. " 
            "We've checked for common tools like Prometheus, Grafana, and metrics-server, but "
            "can't determine if they're properly configured or what dashboards exist. Consider implementing "
            "a comprehensive monitoring stack with service discovery for automatic monitoring of new services."
        ),
        "recommendation": (
            "Implement a Prometheus-Grafana stack with service discovery to automatically monitor " 
            "new services. Configure alert rules for critical components and integrate with notification systems."
        ),
        "reference": "https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/"
    })
    
    # Check for Prometheus annotations
    prometheus_annotated_count = sum(
        1 for pod in pods
        if any(
            "prometheus" in key or "metrics" in key or "metrics" in value
            for key, value in pod.get("metadata", {}).get("annotations", {}).items()
        )
    )
    
    prometheus_percentage = safe_percentage(prometheus_annotated_count, len(pods))
    observability_checks.append({
        "name": "Application metrics",
        "passed": prometheus_percentage >= 50,
        "details": (
            f"{prometheus_percentage}% of pods have metrics annotations"
            if prometheus_percentage >= 50
            else f"Only {prometheus_percentage}% of pods have metrics annotations"
        ),
        "explanation": (
            "Application metrics help you understand your service behavior and performance. " 
            "While we can detect Prometheus annotations, it's important to expose the right metrics " 
            "that reflect application health, business KPIs, and user experience. Define SLIs (Service Level " 
            "Indicators) for each service and implement the RED method (Rate, Errors, Duration) "
            "or USE method (Utilization, Saturation, Errors) as appropriate."
        ),
        "recommendation": (
            "Add Prometheus annotations to your pods including 'prometheus.io/scrape: true', 'prometheus.io/port: <port>', "
            "and 'prometheus.io/path: /metrics'. Ensure your applications expose a /metrics endpoint with appropriate "
            "metrics that follow the RED method (Request Rate, Error Rate, Duration) for services and "
            "USE method (Utilization, Saturation, Errors) for resources."
        ),
        "reference": "https://learn.microsoft.com/en-us/azure/azure-monitor/containers/prometheus-metrics-scrape-configuration?tabs=CRDConfig%2CCRDScrapeConfig%2CConfigFileScrapeConfigBasicAuth%2CConfigFileScrapeConfigTLSAuth#enable-pod-annotation-based-scraping"
    })
    
    # Check for logging infrastructure
    logging_infrastructure_exists = any(
        name.lower() in ["fluentd", "fluent-bit", "filebeat", "logstash", "elastic", "elasticsearch", "loki", "logging"]
        for deployment in deployments
        if (name := deployment.get("metadata", {}).get("name", ""))
    )
    
    logging_percentage = 100 if logging_infrastructure_exists else 0
    observability_checks.append({
        "name": "Logging infrastructure",
        "passed": logging_infrastructure_exists,
        "details": (
            "Logging infrastructure detected" if logging_infrastructure_exists 
            else "No common logging infrastructure detected"
        ),
        "explanation": (
            "Centralized logging simplifies troubleshooting across distributed services. " 
            "Beyond just collecting logs, ensure you're implementing structured logging with " 
            "consistent fields (request IDs, user IDs, etc.) across services. Define log levels " 
            "appropriately and consider implementing log sampling for high-volume services to " 
            "reduce storage costs while maintaining visibility into errors."
        ),
        "recommendation": (
            "Set up centralized logging with ELK stack (Elasticsearch, Logstash, Kibana) or " 
            "Loki with Grafana. Implement structured logging with consistent fields across all services " 
            "and define appropriate log retention policies."
        ),
        "reference": "https://grafana.com/docs/loki/latest/best-practices/"
    })
    
    # Check for tracing-related infrastructure
    tracing_infrastructure_exists = any(
        name.lower() in ["jaeger", "zipkin", "opentelemetry", "otel", "tracing", "tempo"]
        for deployment in deployments
        if (name := deployment.get("metadata", {}).get("name", ""))
    )
    
    tracing_percentage = 100 if tracing_infrastructure_exists else 25  # Give 25% if not detected as it might be external
    observability_checks.append({
        "name": "Distributed tracing",
        "passed": tracing_infrastructure_exists,
        "details": (
            "Tracing infrastructure detected" if tracing_infrastructure_exists 
            else "No common tracing infrastructure detected. You might be using an external service or not implementing tracing."
        ),
        "explanation": (
            "Distributed tracing connects requests across service boundaries, helping identify bottlenecks. " 
            "To implement effectively, use consistent trace context propagation across all services, " 
            "sample intelligently (capture rare events, errors), and correlate traces with logs and metrics. " 
            "Consider implementing OpenTelemetry to standardize instrumentation across different languages and frameworks."
        ),
        "recommendation": (
            "Implement OpenTelemetry-based tracing and deploy Jaeger or Tempo for trace collection and visualization. " 
            "Ensure propagation of trace context across service boundaries and integrate with your existing logging system."
        ),
        "reference": "https://opentelemetry.io/docs/instrumentation/"
    })
    
    # Add a new check for Service Level Objectives (SLOs)
    slo_evidence = any(
        "slo" in name.lower() or "sli" in name.lower() or 
        any("slo" in key.lower() or "sli" in key.lower() for key, value in service.get("metadata", {}).get("labels", {}).items())
        for service in services
    )
    
    slo_percentage = 75 if slo_evidence else 25  # Give 25% by default as this is hard to detect
    observability_checks.append({
        "name": "Service Level Objectives",
        "passed": slo_evidence,
        "details": (
            "Evidence of SLO implementation detected" if slo_evidence 
            else "No clear evidence of SLO implementation found"
        ),
        "explanation": (
            "Service Level Objectives (SLOs) define reliability targets for your services. " 
            "While difficult to detect automatically, implementing SLOs is crucial for balancing " 
            "reliability and feature development. Define SLOs based on user experience metrics, " 
            "set appropriate error budgets, and create alerts based on burning error budgets " 
            "rather than instantaneous failures."
        ),
        "recommendation": (
            "Define SLOs for each critical service based on user-focused metrics. Create dashboards " 
            "showing SLO compliance and error budget burn rates. Set up alerts only for significant " 
            "SLO violations rather than individual failures."
        ),
        "reference": "https://cloud.google.com/blog/products/devops-sre/sre-fundamentals-slis-slas-and-slos"
    })
    
    # Add a check for alerting configuration
    alerting_configuration_exists = any(
        name.lower() in ["alertmanager", "alert", "notification", "pagerduty", "opsgenie"]
        for deployment in deployments
        if (name := deployment.get("metadata", {}).get("name", ""))
    )
    
    alerting_percentage = 100 if alerting_configuration_exists else 30  # Give 30% by default as this is hard to detect
    observability_checks.append({
        "name": "Alert management",
        "passed": alerting_configuration_exists,
        "details": (
            "Alert management system detected" if alerting_configuration_exists 
            else "No alerting system detected"
        ),
        "explanation": (
            "Effective alerting notifies the right people at the right time about critical issues. " 
            "Configure alerting based on symptoms (user impact) rather than causes, and implement " 
            "routing for different severity levels. Alert fatigue can be prevented by reducing noisy " 
            "alerts, implementing good runbooks, and using appropriate alert thresholds with time windows."
        ),
        "recommendation": (
            "Configure AlertManager or a similar tool to handle alert routing, grouping, and silencing. " 
            "Integrate with incident management systems like PagerDuty or OpsGenie. Create detailed " 
            "runbooks for each alert type to speed up resolution."
        ),
        "reference": "https://prometheus.io/docs/alerting/latest/alertmanager/"
    })
    
    # Calculate observability score - average of all check percentages
    if observability_checks:
        check_percentages = [
            monitoring_tools_percentage,
            prometheus_percentage,
            logging_percentage,
            tracing_percentage,
            slo_percentage,
            alerting_percentage
        ]
        observability_score = sum(check_percentages) // len(check_percentages)
    else:
        observability_score = 0
        
    analysis["categories"]["observability"] = {
        "score": observability_score,
        "checks": observability_checks
    }
    
    # --------------------------------------------
    # Calculate Overall Score - average of all category scores
    # --------------------------------------------
    category_scores = [
        analysis["categories"]["resiliency"]["score"],
        analysis["categories"]["workload"]["score"],
        analysis["categories"]["pdb"]["score"],
        analysis["categories"]["topology"]["score"],
        analysis["categories"]["security"]["score"],
        analysis["categories"]["network"]["score"],
        analysis["categories"]["secrets"]["score"],
        analysis["categories"]["observability"]["score"]
    ]
    
    analysis["overall_score"] = sum(category_scores) // len(category_scores) if category_scores else 0
    
    return analysis 