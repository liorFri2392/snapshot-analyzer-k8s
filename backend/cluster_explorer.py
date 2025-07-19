from typing import Dict, List, Optional
from datetime import datetime
from bestpractices_analyzer import analyze_best_practices
from debug_logger import debug_log


class ClusterExplorer:
    def __init__(self, snapshot_data: Dict):
        self.data = snapshot_data
        self.resources = self._process_snapshot()

    def _process_snapshot(self) -> Dict:
        return {
            # Core resources
            'nodes': self._process_resource('nodeList'),
            'pods': self._process_resource('podList'),
            'services': self._process_resource('serviceList'),
            'deployments': self._process_resource('deploymentList'),
            'daemonsets': self._process_resource('daemonSetList'),
            'statefulsets': self._process_resource('statefulSetList'),
            'replicationcontrollers': self._process_resource('replicationControllerList'),
            'replicasets': self._process_resource('replicaSetList'),
            'jobs': self._process_resource('jobList'),

            # Storage resources
            'persistentvolumes': self._process_resource('persistentVolumeList'),
            'persistentvolumeclaims': self._process_resource('persistentVolumeClaimList'),
            'storageclasses': self._process_resource('storageClassList'),
            'csinodes': self._process_resource('csiNodeList'),

            # Configuration resources
            'configmaps': self._process_resource('configMapList'),
            'poddisruptionbudgets': self._process_resource('podDisruptionBudgetList'),
            'horizontalpodautoscalers': self._process_resource('horizontalPodAutoscalerList'),

            # Network resources
            'ingresses': self._process_resource('ingressList'),
            'networkpolicies': self._process_resource('networkPolicyList'),

            # RBAC resources
            'roles': self._process_resource('roleList'),
            'rolebindings': self._process_resource('roleBindingList'),
            'clusterroles': self._process_resource('clusterRoleList'),
            'clusterrolebindings': self._process_resource('clusterRoleBindingList'),

            # Namespace and events
            'namespaces': self._process_resource('NamespaceList'),
            'events': self._process_resource('eventList'),

            # Node management
            'awsnodetemplates': self._process_resource('awsNodeTemplatesList'),
            'provisioners': self._process_resource('provisionersList'),
            'machines': self._process_resource('machinesList'),
            'ec2nodeclasses': self._process_resource('ec2NodeClassesList'),
            'nodepools': self._process_resource('nodepoolsList'),
            'nodeclaims': self._process_resource('nodeclaimsList'),
            'ec2nodeclassesv1': self._process_resource('ec2NodeClassesListV1'),
            'nodepoolsv1': self._process_resource('nodepoolsListV1'),
            'nodeclaimsv1': self._process_resource('nodeclaimsListV1'),

            # Extended resources
            'extendeddaemonsetreplicasets': self._process_resource('extendedDaemonSetReplicaSetList'),
            'rollouts': self._process_resource('rolloutList'),
            'recommendations': self._process_resource('recommendationList'),
            'woop': self._process_resource('recommendationList'),

            # Metrics
            'podmetrics': self._process_resource('podMetricsList')
        }

    def _process_resource(self, resource_type: str) -> List[Dict]:
        # Handle case where resource_type doesn't exist in data
        if resource_type not in self.data:
            return []

        # Get items, default to empty list if not present
        items = self.data.get(resource_type, {}).get('items', [])

        # Handle None case
        if items is None:
            return []

        return items

    def get_resource_summary(self) -> Dict[str, int]:
        return {
            resource_type: len(items)
            for resource_type, items in self.resources.items()
        }

    def get_resource_details(self, resource_type: str) -> List[Dict]:
        return self.resources.get(resource_type, [])

    def search_by_label(self, label_key: str, label_value: Optional[str] = None) -> Dict[str, List]:
        results = {}
        for resource_type, resources in self.resources.items():
            matched = []
            for resource in resources:
                labels = resource.get('metadata', {}).get('labels', {})
                if label_key in labels:
                    if label_value is None or labels[label_key] == label_value:
                        matched.append(resource)
            if matched:
                results[resource_type] = matched
        return results

    def get_namespaced_resources(self, namespace: str) -> Dict[str, List]:
        namespaced_resources = {}
        for resource_type, resources in self.resources.items():
            matched = [r for r in resources if r.get('metadata', {}).get('namespace') == namespace]
            if matched:
                namespaced_resources[resource_type] = matched
        return namespaced_resources

    def search_by_components(self, components: List[str], resource_types: List[str], mode: str = "include") -> Dict:
        """
        Search for resources that include or exclude specific Kubernetes components.
        
        Args:
            components: List of component paths to search for (e.g. 'topologySpreadConstraints', 'resources.requests')
            resource_types: List of resource types to search in (e.g. 'pods', 'deployments')
            mode: Either 'include' (default) to find resources with components or 'exclude' to find without
            
        Returns:
            Dict containing search results with matched resources
        """
        results = []
        total_resources = 0
        
        # Add logging to see what we're searching for
        print(f"Searching for components: {components} in resource types: {resource_types}, mode: {mode}")
        
        # Helper function to check if a resource contains a specific component
        def resource_contains_component(resource: Dict, component_path: str, resource_type: str) -> bool:
            # Add debug logging for the resource being checked
            kind = resource_type
            name = resource.get("metadata", {}).get("name", "unnamed")
            
            # Handle special cases first
            if component_path == "topologySpreadConstraints":
                # Check directly in spec for Pods, or in spec.template.spec for controllers
                if resource_type in ["deployments", "statefulsets", "replicasets", "daemonsets", "jobs"]:
                    has_component = bool(resource.get("spec", {}).get("template", {}).get("spec", {}).get("topologySpreadConstraints", []))
                    print(f"Checking {kind}/{name} for topologySpreadConstraints: {has_component}")
                    return has_component
                return bool(resource.get("spec", {}).get("topologySpreadConstraints", []))
            elif component_path == "resources.requests":
                # Resources requests are in a very specific location in Kubernetes resources
                # For controllers (Deployment, StatefulSet, etc.), they're in spec.template.spec.containers[*].resources.requests

                if resource_type in ["deployments", "statefulsets", "replicasets", "daemonsets", "jobs"]:
                    print(f"Checking controller {kind}/{name} for resource.requests")
                    template = resource.get("spec", {}).get("template")
                    if not template:
                        print(f"  - No template found in {kind}/{name}")
                        return False
                        
                    template_spec = template.get("spec", {})
                    if not template_spec:
                        print(f"  - No template.spec found in {kind}/{name}")
                        return False
                        
                    containers = template_spec.get("containers", [])
                    init_containers = template_spec.get("initContainers", [])
                else:
                    # For Pods, containers are directly in spec
                    print(f"Checking Pod/{name} for resource.requests")
                    containers = resource.get("spec", {}).get("containers", [])
                    init_containers = resource.get("spec", {}).get("initContainers", [])
                
                container_count = len(containers) + len(init_containers)
                print(f"  - Found {container_count} containers to check")
                
                if container_count == 0:
                    print(f"  - Warning: No containers found in {kind}/{name}")
                    return False
                
                # Flag to determine if any container has unbalanced memory resources
                has_memory_imbalance = False
                has_resource_requests = False
                
                # Verify each container for resource requests
                for i, container in enumerate(containers + init_containers):
                    container_name = container.get("name", f"container-{i}")
                    
                    # Check if container has resources and requests defined
                    if not container.get("resources"):
                        print(f"  - Container {container_name} has no resources section")
                        continue
                    
                    resources = container.get("resources", {})    
                    requests = resources.get("requests", {})
                    limits = resources.get("limits", {})
                    
                    # Check if no requests are set
                    if not requests:
                        print(f"  - Container {container_name} has no requests in resources")
                        continue
                        
                    # Check for CPU and Memory requests
                    has_cpu_request = bool(requests.get("cpu"))
                    has_memory_request = bool(requests.get("memory"))
                    
                    # If any container has requests, the resource has resource requests
                    if has_cpu_request or has_memory_request:
                        has_resource_requests = True
                    
                    # Check for CPU and Memory limits
                    has_cpu_limit = bool(limits.get("cpu"))
                    has_memory_limit = bool(limits.get("memory"))
                    
                    # Check if memory request exists but doesn't match the limit or limit doesn't exist
                    if has_memory_request:
                        memory_request = requests.get("memory")
                        memory_limit = limits.get("memory") if has_memory_limit else None
                        
                        # Memory request exists but limit doesn't, or they don't match
                        if not has_memory_limit or memory_request != memory_limit:
                            print(f"  - MEMORY IMBALANCE in container {container_name}: request={memory_request}, limit={memory_limit}")
                            has_memory_imbalance = True
                    
                    print(f"  - Container {container_name}: CPU requests: {has_cpu_request}, Memory requests: {has_memory_request}")
                    print(f"  - Container {container_name}: CPU limits: {has_cpu_limit}, Memory limits: {has_memory_limit}")
                
                # After checking all containers, mark the resource if needed and return whether we found requests
                if has_resource_requests:
                    print(f"  - MATCH: Resource {kind}/{name} has resource requests")
                    
                    # Store memory imbalance info in the resource for frontend use
                    if has_memory_imbalance:
                        annotations = resource.get("metadata", {}).get("annotations", {})
                        if not annotations:
                            if "metadata" not in resource:
                                resource["metadata"] = {}
                            if "annotations" not in resource["metadata"]:
                                resource["metadata"]["annotations"] = {}
                        
                        # Set a marker annotation for the frontend to detect
                        resource["metadata"]["annotations"]["memory-resources-imbalance"] = "true"
                        print(f"  - Marked resource {kind}/{name} with memory imbalance annotation")
                    
                    return True
                
                print(f"  - No containers with resource requests found in {kind}/{name}")
                return False
            elif component_path == "podDisruptionBudget":
                # A resource is protected by a PDB if the PDB's selector matches the resource's labels
                # Services cannot have PDBs - they protect Pods, not Services
                if resource_type == "services":
                    return False
                
                resource_labels = resource.get("metadata", {}).get("labels", {})
                
                if not resource_labels:
                    return False
                
                # Check for direct annotation
                if resource.get("metadata", {}).get("annotations", {}).get("policy/pdb"):
                    return True
                
                # Check all PDBs
                pdbs = self.resources.get("poddisruptionbudgets", [])
                
                for pdb in pdbs:
                    pdb_namespace = pdb.get("metadata", {}).get("namespace", "default")
                    resource_namespace = resource.get("metadata", {}).get("namespace")
                    
                    # Skip if namespaces don't match
                    if pdb_namespace != resource_namespace:
                        continue
                    
                    # Get selector
                    selector = pdb.get("spec", {}).get("selector", {}).get("matchLabels", {})
                    
                    if not selector:
                        continue
                    
                    # Check if all keys match
                    matches = True
                    for key, value in selector.items():
                        if resource_labels.get(key) != value:
                            matches = False
                            break
                    
                    if matches:
                        return True
                
                return False
            elif component_path == "podAntiAffinity" or component_path == "podAffinity" or component_path == "nodeAffinity":
                # Fix affinity checking - this was the issue!
                # The component path strings need to match exactly what's in the Kubernetes resource
                
                # Get the affinity object from the correct location based on resource kind
                if resource_type in ["deployments", "statefulsets", "replicasets", "daemonsets", "jobs"]:
                    template_spec = resource.get("spec", {}).get("template", {}).get("spec", {})
                    affinity = template_spec.get("affinity", {})
                else:
                    affinity = resource.get("spec", {}).get("affinity", {})
                
                # Print the actual affinity object for debugging
                print(f"  - Affinity object for {kind}/{name}: {affinity}")
                
                # Check if the component exists and is not empty
                # Important: Don't use component_path directly, as Kubernetes uses camelCase
                # The variables "podAntiAffinity", "podAffinity", "nodeAffinity" are correctly spelled in camelCase
                # and match what's in the resource
                has_component = False
                
                if component_path == "podAntiAffinity" and "podAntiAffinity" in affinity:
                    has_component = bool(affinity.get("podAntiAffinity"))
                elif component_path == "podAffinity" and "podAffinity" in affinity:
                    has_component = bool(affinity.get("podAffinity"))
                elif component_path == "nodeAffinity" and "nodeAffinity" in affinity:
                    has_component = bool(affinity.get("nodeAffinity"))
                
                print(f"Checking {kind}/{name} for {component_path}: {has_component}")
                return has_component
            elif component_path == "nodeSelector":
                # Check in different locations based on resource type
                if resource_type in ["deployments", "statefulsets", "replicasets", "daemonsets", "jobs"]:
                    has_component = bool(resource.get("spec", {}).get("template", {}).get("spec", {}).get("nodeSelector"))
                    print(f"Checking {kind}/{name} for nodeSelector: {has_component}")
                    return has_component
                return bool(resource.get("spec", {}).get("nodeSelector"))
            elif component_path == "tolerations":
                # Check in different locations based on resource type
                if resource_type in ["deployments", "statefulsets", "replicasets", "daemonsets", "jobs"]:
                    has_component = bool(resource.get("spec", {}).get("template", {}).get("spec", {}).get("tolerations"))
                    print(f"Checking {kind}/{name} for tolerations: {has_component}")
                    return has_component
                return bool(resource.get("spec", {}).get("tolerations"))
            elif component_path == "topologyKeys":
                # topologyKeys are only available in Services
                if resource_type != "services":
                    print(f"topologyKeys only apply to services, not {kind}/{name}")
                    return False
                    
                # Check if any topologyKeys exist in the service
                topology_keys = []
                
                # Check in service spec.topologyKeys (Kubernetes >= 1.17)
                if resource.get("spec", {}).get("topologyKeys"):
                    topology_keys = resource.get("spec", {}).get("topologyKeys", [])
                
                # Also check in service spec.externalTrafficPolicy and trafficPolicy (for headless services)
                if resource.get("spec", {}).get("externalTrafficPolicy") == "Local":
                    # Not directly a topologyKey but indicates topology awareness
                    has_component = True
                    print(f"  - MATCH: Found externalTrafficPolicy=Local in {kind}/{name}")
                    return True
                
                has_component = bool(topology_keys)
                print(f"Checking {kind}/{name} for topologyKeys: {has_component}")
                if has_component:
                    print(f"  - MATCH: Found topologyKeys: {topology_keys}")
                return has_component
            elif component_path == "livenessProbe":
                # Liveness probes are defined at the container level
                # We need to check each container in the pod/workload
                print(f"Checking {kind}/{name} for livenessProbe")
                
                # Initialize containers lists
                containers = []
                init_containers = []
                
                # Get containers based on resource type
                if resource_type in ["deployments", "statefulsets", "replicasets", "daemonsets", "jobs"]:
                    containers = resource.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
                    init_containers = resource.get("spec", {}).get("template", {}).get("spec", {}).get("initContainers", [])
                else:
                    containers = resource.get("spec", {}).get("containers", [])
                    init_containers = resource.get("spec", {}).get("initContainers", [])
                
                # Check each container for livenessProbe
                for container in containers + init_containers:
                    if container.get("livenessProbe"):
                        print(f"  - MATCH: Found livenessProbe in container {container.get('name', 'unnamed')}")
                        return True
                
                print(f"  - No livenessProbe found in {kind}/{name}")
                return False
            elif component_path == "readinessProbe":
                # Readiness probes are defined at the container level
                print(f"Checking {kind}/{name} for readinessProbe")
                
                # Initialize containers lists
                containers = []
                init_containers = []
                
                # Get containers based on resource type
                if resource_type in ["deployments", "statefulsets", "replicasets", "daemonsets", "jobs"]:
                    containers = resource.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
                    init_containers = resource.get("spec", {}).get("template", {}).get("spec", {}).get("initContainers", [])
                else:
                    containers = resource.get("spec", {}).get("containers", [])
                    init_containers = resource.get("spec", {}).get("initContainers", [])
                
                # Check each container for readinessProbe
                for container in containers + init_containers:
                    if container.get("readinessProbe"):
                        print(f"  - MATCH: Found readinessProbe in container {container.get('name', 'unnamed')}")
                        return True
                
                print(f"  - No readinessProbe found in {kind}/{name}")
                return False
            elif component_path == "startupProbe":
                # Startup probes are defined at the container level
                print(f"Checking {kind}/{name} for startupProbe")
                
                # Initialize containers lists
                containers = []
                init_containers = []
                
                # Get containers based on resource type
                if resource_type in ["deployments", "statefulsets", "replicasets", "daemonsets", "jobs"]:
                    containers = resource.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
                    init_containers = resource.get("spec", {}).get("template", {}).get("spec", {}).get("initContainers", [])
                else:
                    containers = resource.get("spec", {}).get("containers", [])
                    init_containers = resource.get("spec", {}).get("initContainers", [])
                
                # Check each container for startupProbe
                for container in containers + init_containers:
                    if container.get("startupProbe"):
                        print(f"  - MATCH: Found startupProbe in container {container.get('name', 'unnamed')}")
                        return True
                
                print(f"  - No startupProbe found in {kind}/{name}")
                return False
            
            # For general case, handle nested paths
            parts = component_path.split('.')
            current = resource
            
            for part in parts:
                if isinstance(current, dict) and part in current:
                    current = current[part]
                else:
                    return False
            
            return current is not None and (not isinstance(current, dict) or bool(current))
        
        # Process each resource type
        for resource_type in resource_types:
            # Skip if resource type doesn't exist
            if resource_type not in self.resources:
                print(f"Resource type not found in available resources: {resource_type}")
                continue
            resources = self.resources[resource_type]
            resource_count = len(resources)
            total_resources += resource_count
            print(f"Processing {resource_count} resources of type {resource_type}")
            
            for i, resource in enumerate(resources):
                kind = resource_type
                name = resource.get("metadata", {}).get("name", "unnamed")

                # Check each component
                matching_components = []
                print(f"Checking resource {i+1}/{resource_count}: {kind}/{name}")
                
                for component in components:
                    try:
                        has_component = resource_contains_component(resource, component, resource_type)
                        
                        # Based on search mode, collect component or skip
                        if (mode == "include" and has_component) or (mode == "exclude" and not has_component):
                            matching_components.append(component)
                            print(f"  - Component {component} matched for {kind}/{name}")
                    except Exception as e:
                        print(f"Error checking component {component} for {kind}/{name}: {str(e)}")
                
                # If we have matching components, add this resource to results
                if matching_components:
                    print(f"Adding {kind}/{name} to results with components: {matching_components}")
                    
                    # For the kind field, use a consistent capitalized singular form
                    # This will be properly mapped back to the correct resource type in the frontend
                    displayed_kind = None
                    
                    if resource_type == "deployments":
                        displayed_kind = "Deployment"
                    elif resource_type == "statefulsets":
                        displayed_kind = "StatefulSet"
                    elif resource_type == "daemonsets":
                        displayed_kind = "DaemonSet"
                    elif resource_type == "pods":
                        displayed_kind = "Pod"
                    elif resource_type == "jobs":
                        displayed_kind = "Job"
                    elif resource_type == "cronjobs":
                        displayed_kind = "CronJob"
                    elif resource_type == "replicasets":
                        displayed_kind = "ReplicaSet"
                    elif resource_type == "services":
                        displayed_kind = "Service"
                    else:
                        # Default to capitalizing the first letter and removing trailing 's'
                        displayed_kind = resource_type.capitalize()
                        if displayed_kind.endswith('s'):
                            displayed_kind = displayed_kind[:-1]
                    
                    results.append({
                        "name": name,
                        "namespace": resource.get("metadata", {}).get("namespace", "default"),
                        "kind": displayed_kind,
                        "components": matching_components,
                        "hasMemoryImbalance": resource.get("metadata", {}).get("annotations", {}).get("memory-resources-imbalance") == "true"
                    })
        
        print(f"Search complete. Found {len(results)} matches out of {total_resources} total resources.")
        return {
            "matches": results,
            "totalResources": total_resources,
            "matchCount": len(results)
        }

    def generate_component_report(self, components: List[str], resource_types: List[str]) -> Dict:
        """
        Generate a report of how many resources include each component, across all resource types.
        
        Args:
            components: List of component paths to check for (e.g. 'topologySpreadConstraints', 'resources.requests')
            resource_types: List of resource types to check in (e.g. 'pods', 'deployments')
            
        Returns:
            Dict containing counts of resources with each component, organized by resource type
        """
        report = {}
        
        print(f"Generating report for components: {components} across resource types: {resource_types}")
        
        # Initialize report structure
        for resource_type in resource_types:
            if resource_type not in self.resources:
                continue
                
            report[resource_type] = {
                "total_resources": len(self.resources[resource_type])
            }
            
            for component in components:
                report[resource_type][component] = 0
        
        # Helper function to check if a resource contains a specific component
        def resource_contains_component(resource: Dict, component_path: str, resource_type: str) -> bool:
            # This uses the same function as in search_by_components
            # We're duplicating it here to avoid any side effects or modifications to resources
            # ... (the function implementation would be the same as in search_by_components)
            # Add debug logging for the resource being checked
            kind = resource_type
            name = resource.get("metadata", {}).get("name", "unnamed")
            
            # Handle special cases first
            if component_path == "topologySpreadConstraints":
                # Check directly in spec for Pods, or in spec.template.spec for controllers
                if resource_type in ["deployments", "statefulsets", "replicasets", "daemonsets", "jobs"]:
                    has_component = bool(resource.get("spec", {}).get("template", {}).get("spec", {}).get("topologySpreadConstraints", []))
                    return has_component
                return bool(resource.get("spec", {}).get("topologySpreadConstraints", []))
                
            elif component_path == "resources.requests":
                # Resources requests are in a very specific location in Kubernetes resources
                if resource_type in ["deployments", "statefulsets", "replicasets", "daemonsets", "jobs"]:
                    template = resource.get("spec", {}).get("template")
                    if not template:
                        return False
                        
                    template_spec = template.get("spec", {})
                    if not template_spec:
                        return False
                        
                    containers = template_spec.get("containers", [])
                    init_containers = template_spec.get("initContainers", [])
                else:
                    # For Pods, containers are directly in spec
                    containers = resource.get("spec", {}).get("containers", [])
                    init_containers = resource.get("spec", {}).get("initContainers", [])
                
                if len(containers) + len(init_containers) == 0:
                    return False
                
                # Check if any container has resource requests
                for container in containers + init_containers:
                    if not container.get("resources"):
                        continue
                        
                    requests = container.get("resources", {}).get("requests", {})
                    if requests and (requests.get("cpu") or requests.get("memory")):
                        return True
                
                return False
                
            elif component_path == "podDisruptionBudget":
                # A resource is protected by a PDB if the PDB's selector matches the resource's labels
                # Services cannot have PDBs - they protect Pods, not Services
                if resource_type == "services":
                    return False
                
                resource_labels = resource.get("metadata", {}).get("labels", {})
                
                if not resource_labels:
                    return False
                
                # Check for direct annotation
                if resource.get("metadata", {}).get("annotations", {}).get("policy/pdb"):
                    return True
                
                # Check all PDBs
                pdbs = self.resources.get("poddisruptionbudgets", [])
                
                for pdb in pdbs:
                    pdb_namespace = pdb.get("metadata", {}).get("namespace", "default")
                    resource_namespace = resource.get("metadata", {}).get("namespace")
                    
                    # Skip if namespaces don't match
                    if pdb_namespace != resource_namespace:
                        continue
                    
                    # Get selector
                    selector = pdb.get("spec", {}).get("selector", {}).get("matchLabels", {})
                    
                    if not selector:
                        continue
                    
                    # Check if all keys match
                    matches = True
                    for key, value in selector.items():
                        if resource_labels.get(key) != value:
                            matches = False
                            break
                    
                    if matches:
                        return True
                
                return False
                
            elif component_path == "podAntiAffinity" or component_path == "podAffinity" or component_path == "nodeAffinity":
                # Check affinity
                if resource_type in ["deployments", "statefulsets", "replicasets", "daemonsets", "jobs"]:
                    template_spec = resource.get("spec", {}).get("template", {}).get("spec", {})
                    affinity = template_spec.get("affinity", {})
                else:
                    affinity = resource.get("spec", {}).get("affinity", {})
                
                if component_path == "podAntiAffinity" and "podAntiAffinity" in affinity:
                    return bool(affinity.get("podAntiAffinity"))
                elif component_path == "podAffinity" and "podAffinity" in affinity:
                    return bool(affinity.get("podAffinity"))
                elif component_path == "nodeAffinity" and "nodeAffinity" in affinity:
                    return bool(affinity.get("nodeAffinity"))
                
                return False
                
            elif component_path == "nodeSelector":
                # Check nodeSelector
                if resource_type in ["deployments", "statefulsets", "replicasets", "daemonsets", "jobs"]:
                    return bool(resource.get("spec", {}).get("template", {}).get("spec", {}).get("nodeSelector"))
                return bool(resource.get("spec", {}).get("nodeSelector"))
                
            elif component_path == "tolerations":
                # Check tolerations
                if resource_type in ["deployments", "statefulsets", "replicasets", "daemonsets", "jobs"]:
                    return bool(resource.get("spec", {}).get("template", {}).get("spec", {}).get("tolerations"))
                return bool(resource.get("spec", {}).get("tolerations"))
                
            elif component_path == "topologyKeys":
                # topologyKeys are only available in Services
                if resource_type != "services":
                    return False
                    
                # Check if any topologyKeys exist in the service
                topology_keys = []
                
                # Check in service spec.topologyKeys (Kubernetes >= 1.17)
                if resource.get("spec", {}).get("topologyKeys"):
                    topology_keys = resource.get("spec", {}).get("topologyKeys", [])
                
                # Also check in service spec.externalTrafficPolicy and trafficPolicy (for headless services)
                if resource.get("spec", {}).get("externalTrafficPolicy") == "Local":
                    # Not directly a topologyKey but indicates topology awareness
                    return True
                
                return bool(topology_keys)
                
            elif component_path in ["livenessProbe", "readinessProbe", "startupProbe"]:
                # Check for probes in containers
                containers = []
                init_containers = []
                
                if resource_type in ["deployments", "statefulsets", "replicasets", "daemonsets", "jobs"]:
                    containers = resource.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
                    init_containers = resource.get("spec", {}).get("template", {}).get("spec", {}).get("initContainers", [])
                else:
                    containers = resource.get("spec", {}).get("containers", [])
                    init_containers = resource.get("spec", {}).get("initContainers", [])
                
                for container in containers + init_containers:
                    if container.get(component_path):
                        return True
                
                return False
            
            # For general case, handle nested paths
            parts = component_path.split('.')
            current = resource
            
            for part in parts:
                if isinstance(current, dict) and part in current:
                    current = current[part]
                else:
                    return False
            
            return current is not None and (not isinstance(current, dict) or bool(current))
        
        # Process each resource type
        for resource_type in resource_types:
            if resource_type not in self.resources:
                print(f"Resource type not found in available resources: {resource_type}")
                continue
                
            resources = self.resources[resource_type]
            resource_count = len(resources)
            
            if resource_count == 0:
                continue
                
            print(f"Processing {resource_count} resources of type {resource_type}")
            
            # Process each resource
            for resource in resources:
                # Check each component
                for component in components:
                    try:
                        has_component = resource_contains_component(resource, component, resource_type)
                        
                        if has_component:
                            report[resource_type][component] += 1
                    except Exception as e:
                        print(f"Error checking component {component}: {str(e)}")
        
        print(f"Report generation complete.")
        return report

    def analyze_best_practices(self) -> Dict:
        """
        Analyze the cluster resources against best practices.
        
        Returns:
            Dictionary with analysis results
        """
        debug_log("Starting best practices analysis in ClusterExplorer", "INFO")
        
        # Check if we have resources to analyze
        if not self.resources:
            debug_log("No resources available for best practices analysis", "WARNING")
            return self._get_default_best_practices_result()
        
        # Log the resources we have available
        resource_counts = {k: len(v) for k, v in self.resources.items() if v}
        debug_log(f"Resources available for analysis: {resource_counts}", "INFO")
        
        try:
            # Call the analyzer module
            results = analyze_best_practices(self.resources)
            
            if results is None:
                debug_log("Best practices analysis returned None", "WARNING")
                return self._get_default_best_practices_result()
                
            debug_log(f"Best practices analysis completed with overall score: {results.get('overall_score', 0)}", "INFO")
            return results
            
        except Exception as e:
            debug_log(f"Error during best practices analysis: {str(e)}", "ERROR")
            import traceback
            debug_log(f"Traceback: {traceback.format_exc()}", "ERROR")
            return self._get_default_best_practices_result()
    
    def _get_default_best_practices_result(self) -> Dict:
        """
        Return a default structure for best practices analysis when no valid analysis can be performed.
        """
        debug_log("Returning default best practices result structure", "INFO")
        return {
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

    def generate_node_pods_report(self) -> Dict[str, List]:
        """
        Generate a report of pods running on each node.
        
        Returns:
            Dictionary where keys are node names and values are lists of pods running on that node
        """
        debug_log("Generating node pods report", "INFO")
        
        # Get nodes and pods
        nodes = self.resources.get('nodes', [])
        pods = self.resources.get('pods', [])
        
        if not nodes or not pods:
            debug_log("No nodes or pods available for node pods report", "WARNING")
            return {}
        
        # Initialize the result dict
        node_pods_map = {}
        
        # Group pods by node
        for node in nodes:
            node_name = node.get('metadata', {}).get('name')
            if not node_name:
                continue
            
            # Find all pods running on this node
            pods_on_node = []
            for pod in pods:
                pod_node_name = pod.get('spec', {}).get('nodeName')
                if pod_node_name == node_name:
                    pods_on_node.append(pod)
            
            # Add to the mapping
            node_pods_map[node_name] = pods_on_node
        
        debug_log(f"Node pods report generated for {len(node_pods_map)} nodes", "INFO")
        return node_pods_map