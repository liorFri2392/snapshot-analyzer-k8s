import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, CheckCircle, AlertCircle, XCircle, 
  ChevronDown, ChevronUp, RotateCcw, FileText, Loader2, Play,
  ExternalLink
} from 'lucide-react';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const BestPracticesDetailView = ({ analysisResults, isLoading, onReanalyze, onClose, clusterName, clusterId }) => {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const reportContainerRef = useRef(null);
  
  if (!analysisResults && !isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Analysis Results Available</h3>
          <p className="text-gray-600 mb-4">Analysis data is not yet available. Please wait for the cluster resources to load fully or run an analysis.</p>
          <button
            onClick={onReanalyze}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Run Analysis
          </button>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold">Analyzing Cluster</h3>
          <p className="text-gray-600">This may take a moment...</p>
        </div>
      </div>
    );
  }
  
  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };
  
  const getScoreIcon = (score) => {
    if (score >= 70) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 40) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };
  
  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getScoreBgColor = (score) => {
    if (score >= 70) return 'bg-green-50';
    if (score >= 40) return 'bg-yellow-50';
    return 'bg-red-50';
  };
  
  // Add a special handler for pod anti-affinity which uses inverse thresholds
  const getScoreColorForPodAntiAffinity = (score) => {
    if (score <= 30) return 'text-green-600';
    if (score <= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIconForPodAntiAffinity = (score) => {
    if (score <= 30) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score <= 70) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getScoreBgColorForPodAntiAffinity = (score) => {
    if (score <= 30) return 'bg-green-50';
    if (score <= 70) return 'bg-yellow-50';
    return 'bg-red-50';
  };
  
  // Function to extract percentage from the details string
  const extractPercentage = (details) => {
    const percentageMatch = details.match(/(\d+)%/);
    if (percentageMatch && percentageMatch[1]) {
      return parseInt(percentageMatch[1], 10);
    }
    return 0;
  };
  
  // Function to determine check background color based on percentage in details
  const getCheckBgColor = (check) => {
    if (check.name.includes('Pod anti-affinity') && !check.name.includes('Required') && !check.name.includes('Preferred')) {
      // For the main pod anti-affinity check, invert the colors
      const percentage = extractPercentage(check.details);
      if (percentage <= 30) return 'bg-green-50';
      if (percentage <= 70) return 'bg-yellow-50';
      return 'bg-red-50';
    }
    
    if (check.passed) {
      return 'bg-green-50';
    } else {
      return 'bg-red-50';
    }
  };
  
  // Similar function to determine the check icon
  const getCheckStatusIcon = (check) => {
    if (check.name.includes('Pod anti-affinity') && !check.name.includes('Required') && !check.name.includes('Preferred')) {
      // For the main pod anti-affinity check, invert the icons
      const percentage = extractPercentage(check.details);
      if (percentage <= 30) return <CheckCircle className="w-5 h-5 text-green-600" />;
      if (percentage <= 70) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
    
    return check.passed 
      ? <CheckCircle className="w-5 h-5 text-green-600" /> 
      : <XCircle className="w-5 h-5 text-red-600" />;
  };
  
  // Function to get category display name from category ID
  const getCategoryDisplayName = (categoryId) => {
    // Special case for 'pdb'
    if (categoryId === 'pdb') return 'PodDisruptionBudget';
    
    // Default case: replace underscores with spaces and capitalize
    return categoryId.replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const getCategoryRecommendation = (categoryId) => {
    switch(categoryId) {
      case 'resiliency':
        return "Ensure applications are deployed across multiple zones with proper health checks and graceful termination to handle disruptions.";
      case 'workload':
        return "Define appropriate resource requests and limits for all containers based on actual usage patterns.";
      case 'pdb':
        return "Implement Pod Disruption Budgets for all stateful applications and critical workloads.";
      case 'topology':
        return "Use topology spread constraints and appropriate pod anti-affinity (required for critical workloads, preferred for others) for even distribution of pods across failure domains.";
      case 'security':
        return "Implement network policies, run containers as non-root, and scan images for vulnerabilities.";
      case 'network':
        return "Configure proper network topologies and policies to ensure secure and optimized communication.";
      case 'secrets':
        return "Use external secrets management solutions and ensure proper RBAC controls.";
      case 'observability':
        return "Implement comprehensive metrics, logging, and tracing for better visibility into cluster operations.";
      default:
        return "Follow best practices for this category to improve cluster stability and security.";
    }
  };
  
  const generateReport = () => {
    if (!analysisResults || !reportContainerRef.current) return;
    
    setIsGeneratingReport(true);
    
    try {
      // Save the current expanded state to restore later
      const originalExpandedState = {...expandedCategories};
      
      // Temporarily expand all categories for the PDF export
      const allExpanded = {};
      if (analysisResults && analysisResults.categories) {
        Object.keys(analysisResults.categories).forEach(categoryId => {
          allExpanded[categoryId] = true;
        });
        setExpandedCategories(allExpanded);
      }
      
      // Use setTimeout to allow React to update the DOM with expanded sections before we clone it
      setTimeout(() => {
        try {
          // Create a new PDF document with better initial settings
          const pdf = new jsPDF({
            unit: 'mm',
            format: 'a4',
            compress: true,
            orientation: 'portrait',
          });
          
          // Add title page
          const titlePage = document.createElement('div');
          titlePage.style.width = '210mm'; // A4 width
          titlePage.style.padding = '20mm';
          titlePage.style.boxSizing = 'border-box';
          titlePage.style.textAlign = 'center';
          titlePage.style.position = 'absolute';
          titlePage.style.left = '-9999px';
          
          const logo = document.createElement('div');
          logo.style.fontSize = '40px';
          logo.style.color = '#2563EB';
          logo.style.marginBottom = '20mm';
          logo.textContent = '🔍';
          titlePage.appendChild(logo);
          
          const title = document.createElement('h1');
          title.textContent = 'Kubernetes Best Practices Analysis';
          title.style.fontSize = '24px';
          title.style.fontWeight = 'bold';
          title.style.color = '#1E293B';
          title.style.marginBottom = '10mm';
          titlePage.appendChild(title);
          
          const clusterInfo = document.createElement('p');
          if (analysisResults.cluster_name) {
            clusterInfo.textContent = `Cluster: ${analysisResults.cluster_name}`;
            if (analysisResults.cluster_id) {
              clusterInfo.textContent += ` (${analysisResults.cluster_id})`;
            }
          }
          clusterInfo.style.fontSize = '16px';
          clusterInfo.style.color = '#475569';
          clusterInfo.style.marginBottom = '5mm';
          titlePage.appendChild(clusterInfo);
          
          const date = document.createElement('p');
          date.textContent = `Generated: ${new Date().toLocaleString()}`;
          date.style.fontSize = '14px';
          date.style.color = '#64748B';
          titlePage.appendChild(date);
          
          const overallScore = document.createElement('div');
          overallScore.style.marginTop = '20mm';
          overallScore.style.padding = '10mm';
          overallScore.style.borderRadius = '8px';
          overallScore.style.backgroundColor = '#EFF6FF';
          
          const scoreValue = document.createElement('div');
          let scoreColor;
          if (analysisResults.overall_score >= 70) {
            scoreColor = '#16A34A';
          } else if (analysisResults.overall_score >= 40) {
            scoreColor = '#FBBF24';
          } else {
            scoreColor = '#DC2626';
          }
          scoreValue.style.fontSize = '48px';
          scoreValue.style.fontWeight = 'bold';
          scoreValue.style.color = scoreColor;
          scoreValue.style.marginBottom = '5mm';
          scoreValue.textContent = `${analysisResults.overall_score}%`;
          overallScore.appendChild(scoreValue);
          
          const scoreLabel = document.createElement('p');
          scoreLabel.textContent = 'Overall Compliance Score';
          scoreLabel.style.fontSize = '16px';
          scoreLabel.style.color = '#334155';
          overallScore.appendChild(scoreLabel);
          
          titlePage.appendChild(overallScore);
          
          // Add to document body temporarily
          document.body.appendChild(titlePage);
          
          // Convert title page to image and add to PDF
          html2canvas(titlePage, {
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true
          }).then(canvas => {
            // Remove from body
            document.body.removeChild(titlePage);
            
            // Add title page to PDF
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const imgWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, null, 'FAST');
            
            // Process each category on a new page
            return processCategories(pdf);
          }).catch(error => {
            console.error('Error generating title page:', error);
            document.body.removeChild(titlePage);
            setExpandedCategories(originalExpandedState);
            setIsGeneratingReport(false);
          });
          
          // Function to process each category one by one
          const processCategories = async (pdf) => {
            if (!analysisResults.categories) {
              finalizePdf(pdf);
              return;
            }
            
            const categoryIds = Object.keys(analysisResults.categories);
            
            // Create a single content element to hold all categories
            // We'll divide it into logical sections during rendering
            const contentContainer = document.createElement('div');
            contentContainer.style.width = '210mm'; // A4 width
            contentContainer.style.padding = '20mm';
            contentContainer.style.boxSizing = 'border-box';
            contentContainer.style.fontFamily = 'Arial, sans-serif';
            contentContainer.style.position = 'absolute';
            contentContainer.style.left = '-9999px';
            
            // Add each category as a section
            for (let i = 0; i < categoryIds.length; i++) {
              const categoryId = categoryIds[i];
              const category = analysisResults.categories[categoryId];
              
              if (!category) continue;
              
              // Create a section container with a data attribute to identify it as a section
              const sectionContainer = document.createElement('div');
              sectionContainer.setAttribute('data-section', 'true');
              sectionContainer.style.marginBottom = '30px';
              sectionContainer.style.pageBreakInside = 'avoid'; // Try to avoid breaking within sections
              
              // Category header with appropriate background color
              const categoryHeader = document.createElement('div');
              categoryHeader.style.borderRadius = '8px';
              categoryHeader.style.marginBottom = '15px';
              categoryHeader.style.padding = '15px';
              
              // Set header background color based on score
              if (category.score >= 70) {
                categoryHeader.style.backgroundColor = '#F0FDF4'; // green-50
                categoryHeader.style.border = '1px solid #DCFCE7'; // green-100
              } else if (category.score >= 40) {
                categoryHeader.style.backgroundColor = '#FEFCE8'; // yellow-50
                categoryHeader.style.border = '1px solid #FEF9C3'; // yellow-100
              } else {
                categoryHeader.style.backgroundColor = '#FEF2F2'; // red-50
                categoryHeader.style.border = '1px solid #FEE2E2'; // red-100
              }
              
              const categoryTitle = document.createElement('h2');
              categoryTitle.textContent = getCategoryDisplayName(categoryId);
              categoryTitle.style.fontSize = '22px';
              categoryTitle.style.fontWeight = 'bold';
              categoryTitle.style.color = '#1E293B';
              categoryTitle.style.marginBottom = '10px';
              categoryHeader.appendChild(categoryTitle);
              
              // Category score
              const scoreContainer = document.createElement('div');
              scoreContainer.style.display = 'flex';
              scoreContainer.style.alignItems = 'center';
              scoreContainer.style.marginBottom = '15px';
              
              let categoryScoreColor;
              let scoreIcon;
              if (category.score >= 70) {
                categoryScoreColor = '#16A34A'; // green-600
                scoreIcon = '✅';
              } else if (category.score >= 40) {
                categoryScoreColor = '#CA8A04'; // yellow-600
                scoreIcon = '⚠️';
              } else {
                categoryScoreColor = '#DC2626'; // red-600
                scoreIcon = '❌';
              }
              
              const categoryScore = document.createElement('span');
              categoryScore.textContent = `${category.score}%`;
              categoryScore.style.fontSize = '24px';
              categoryScore.style.fontWeight = 'bold';
              categoryScore.style.color = categoryScoreColor;
              categoryScore.style.marginRight = '10px';
              scoreContainer.appendChild(categoryScore);
              
              const iconSpan = document.createElement('span');
              iconSpan.textContent = scoreIcon;
              iconSpan.style.fontSize = '20px';
              scoreContainer.appendChild(iconSpan);
              
              categoryHeader.appendChild(scoreContainer);
              
              // Category recommendation
              const recommendation = document.createElement('p');
              recommendation.textContent = getCategoryRecommendation(categoryId);
              recommendation.style.fontSize = '14px';
              recommendation.style.color = '#475569';
              recommendation.style.margin = '0';
              categoryHeader.appendChild(recommendation);
              
              sectionContainer.appendChild(categoryHeader);
              
              // Checks heading
              const checksHeading = document.createElement('h3');
              checksHeading.textContent = 'Check Results';
              checksHeading.style.fontSize = '18px';
              checksHeading.style.fontWeight = 'bold';
              checksHeading.style.color = '#1E293B';
              checksHeading.style.marginBottom = '12px';
              sectionContainer.appendChild(checksHeading);
              
              // Checks list
              if (category.checks && category.checks.length > 0) {
                const checksList = document.createElement('div');
                
                // Group checks in threes to create logical sub-sections 
                // This helps prevent individual checks from being split across pages
                const checksPerGroup = 3;
                for (let checkIndex = 0; checkIndex < category.checks.length; checkIndex += checksPerGroup) {
                  const checkGroup = document.createElement('div');
                  checkGroup.setAttribute('data-check-group', 'true');
                  checkGroup.style.pageBreakInside = 'avoid';
                  checkGroup.style.breakInside = 'avoid';
                  checkGroup.style.marginBottom = '15px';
                  
                  // Add checks to this group (up to 3 per group)
                  const endIndex = Math.min(checkIndex + checksPerGroup, category.checks.length);
                  for (let j = checkIndex; j < endIndex; j++) {
                    const check = category.checks[j];
                    
                    const checkItem = document.createElement('div');
                    checkItem.style.marginBottom = '15px';
                    checkItem.style.padding = '12px';
                    checkItem.style.borderRadius = '8px';
                    checkItem.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    
                    // Determine check status and color
                    let checkIcon;
                    let checkBgColor;
                    let checkBorder;
                    const percentage = extractPercentage(check.details);
                    
                    if (check.name === "Pod anti-affinity") {
                      if (percentage <= 30) {
                        checkIcon = '✅';
                        checkBgColor = '#F0FDF4'; // green-50
                        checkBorder = '1px solid #DCFCE7'; // green-100
                      } else if (percentage <= 70) {
                        checkIcon = '⚠️';
                        checkBgColor = '#FEFCE8'; // yellow-50
                        checkBorder = '1px solid #FEF9C3'; // yellow-100
                      } else {
                        checkIcon = '❌';
                        checkBgColor = '#FEF2F2'; // red-50
                        checkBorder = '1px solid #FEE2E2'; // red-100
                      }
                    } else {
                      if (check.passed) {
                        checkIcon = '✅';
                        checkBgColor = '#F0FDF4'; // green-50
                        checkBorder = '1px solid #DCFCE7'; // green-100
                      } else {
                        checkIcon = '❌';
                        checkBgColor = '#FEF2F2'; // red-50
                        checkBorder = '1px solid #FEE2E2'; // red-100
                      }
                    }
                    
                    checkItem.style.backgroundColor = checkBgColor;
                    checkItem.style.border = checkBorder;
                    
                    // Check header with icon and name
                    const checkHeader = document.createElement('div');
                    checkHeader.style.display = 'flex';
                    checkHeader.style.alignItems = 'flex-start';
                    
                    const iconSpan = document.createElement('span');
                    iconSpan.textContent = checkIcon;
                    iconSpan.style.marginRight = '10px';
                    iconSpan.style.fontSize = '16px';
                    checkHeader.appendChild(iconSpan);
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = check.name;
                    nameSpan.style.fontWeight = 'bold';
                    nameSpan.style.fontSize = '15px';
                    nameSpan.style.color = '#334155'; // slate-700
                    checkHeader.appendChild(nameSpan);
                    
                    checkItem.appendChild(checkHeader);
                    
                    // Check details
                    const detailsP = document.createElement('p');
                    detailsP.textContent = check.details;
                    detailsP.style.fontSize = '13px';
                    detailsP.style.color = '#475569'; // slate-600
                    detailsP.style.marginTop = '8px';
                    detailsP.style.marginLeft = '26px';
                    detailsP.style.marginBottom = '5px';
                    checkItem.appendChild(detailsP);
                    
                    // Additional info for anti-affinity
                    if (check.name.includes("Pod anti-affinity")) {
                      const typeP = document.createElement('p');
                      if (check.name.includes("Required")) {
                        typeP.textContent = `Required (${percentage}%) - for critical workloads that must be spread across nodes`;
                        typeP.style.color = '#2563EB'; // blue-600
                      } else if (check.name.includes("Preferred")) {
                        typeP.textContent = `Preferred (${percentage}%) - for non-critical workloads where spreading is beneficial but not essential`;
                        typeP.style.color = '#9333EA'; // purple-600
                      }
                      typeP.style.fontSize = '13px';
                      typeP.style.marginTop = '8px';
                      typeP.style.marginLeft = '26px';
                      typeP.style.marginBottom = '5px';
                      typeP.style.fontStyle = 'italic';
                      checkItem.appendChild(typeP);
                    }
                    
                    // Recommendation if available
                    if (check.recommendation) {
                      const recommendDiv = document.createElement('div');
                      recommendDiv.style.marginTop = '10px';
                      recommendDiv.style.marginLeft = '26px';
                      recommendDiv.style.padding = '8px 12px';
                      recommendDiv.style.backgroundColor = '#ECFDF5'; // green-50
                      recommendDiv.style.border = '1px solid #D1FAE5'; // green-100
                      recommendDiv.style.borderRadius = '6px';
                      
                      const recommendLabel = document.createElement('span');
                      recommendLabel.textContent = 'Recommendation: ';
                      recommendLabel.style.fontWeight = 'bold';
                      recommendLabel.style.fontSize = '13px';
                      recommendLabel.style.color = '#065F46'; // green-800
                      recommendDiv.appendChild(recommendLabel);
                      
                      const recommendText = document.createElement('span');
                      recommendText.textContent = check.recommendation;
                      recommendText.style.fontSize = '13px';
                      recommendText.style.color = '#065F46'; // green-800
                      recommendDiv.appendChild(recommendText);
                      
                      checkItem.appendChild(recommendDiv);
                    }
                    
                    checkGroup.appendChild(checkItem);
                  }
                  
                  checksList.appendChild(checkGroup);
                }
                
                sectionContainer.appendChild(checksList);
              }
              
              // Create recommendations section as its own group to avoid page breaks
              const recommendationsGroup = document.createElement('div');
              recommendationsGroup.setAttribute('data-check-group', 'true');
              recommendationsGroup.style.pageBreakInside = 'avoid';
              recommendationsGroup.style.breakInside = 'avoid';
              
              // Add recommendations section for category
              if (category.checks && category.checks.filter(check => !check.passed).length > 0) {
                const recommendationsSection = document.createElement('div');
                recommendationsSection.style.marginTop = '20px';
                
                const recommendationsTitle = document.createElement('h3');
                recommendationsTitle.textContent = 'Recommendations';
                recommendationsTitle.style.fontSize = '18px';
                recommendationsTitle.style.fontWeight = 'bold';
                recommendationsTitle.style.color = '#1E293B'; // slate-800
                recommendationsTitle.style.marginBottom = '12px';
                recommendationsSection.appendChild(recommendationsTitle);
                
                const recommendationsBox = document.createElement('div');
                recommendationsBox.className = 'recommendations-box';
                recommendationsBox.style.backgroundColor = '#EFF6FF'; // blue-50
                recommendationsBox.style.border = '1px solid #DBEAFE'; // blue-100
                recommendationsBox.style.borderRadius = '8px';
                recommendationsBox.style.padding = '15px';
                
                const recommendationsList = document.createElement('ul');
                recommendationsList.style.paddingLeft = '20px';
                recommendationsList.style.margin = '0';
                
                category.checks.filter(check => !check.passed).forEach((check, index) => {
                  // Prefer the backend recommendation if available
                  const recommendation = check.recommendation || (() => {
                    // The existing code for generating recommendations as fallback
                    switch(categoryId) {
                      case 'resiliency':
                        if (check.name.includes("Multi-zone")) {
                          return "Deploy applications across multiple availability zones to improve fault tolerance.";
                        } else if (check.name.includes("Health checks")) {
                          return "Implement liveness, readiness, and startup probes for all workloads.";
                        } else if (check.name.includes("Graceful termination")) {
                          return "Configure preStop hooks and appropriate terminationGracePeriodSeconds.";
                        }
                        break;
                      case 'workload':
                        if (check.name.includes("Resource requests")) {
                          return "Define CPU and memory requests for all containers based on actual usage patterns.";
                        } else if (check.name.includes("Resource limits")) {
                          return "Set memory limits equal to requests to ensure guaranteed QoS class. Consider using a LimitRange.";
                        }
                        break;
                      case 'pdb':
                        if (check.name.includes("PDB coverage")) {
                          return "Implement PDBs for all stateful applications and critical workloads.";
                        } else if (check.name.includes("PDB configuration")) {
                          return "Review PDB settings to ensure they don't block node draining. Use maxUnavailable rather than minAvailable where appropriate.";
                        }
                        break;
                      case 'topology':
                        if (check.name.includes("Topology constraints")) {
                          return "Implement topology spread constraints for even pod distribution across failure domains.";
                        } else if (check.name.includes("Pod anti-affinity") && check.name.includes("Required")) {
                          return "Configure required pod anti-affinity for critical stateful workloads with low replica counts (2-3).";
                        } else if (check.name.includes("Pod anti-affinity") && check.name.includes("Preferred")) {
                          return "Use preferred pod anti-affinity for non-critical workloads to balance distribution while allowing scheduling flexibility.";
                        } else if (check.name.includes("Pod anti-affinity")) {
                          return "Configure pod anti-affinity for workloads to ensure proper distribution across nodes.";
                        }
                        break;
                      case 'security':
                        if (check.name.includes("Network policies")) {
                          return "Implement default deny network policies and explicitly allow required traffic.";
                        } else if (check.name.includes("Security context")) {
                          return "Configure security contexts to run containers as non-root with appropriate capabilities.";
                        }
                        break;
                      case 'network':
                        if (check.name.includes("Service Topology")) {
                          return "Implement topologyKeys in Service definitions to optimize traffic routing.";
                        }
                        break;
                      case 'secrets':
                        if (check.name.includes("Secret management")) {
                          return "Use external secrets management solutions (e.g., Vault, cloud provider solutions).";
                        }
                        break;
                      case 'observability':
                        return "Enhance observability by implementing comprehensive metrics, logging, and tracing.";
                      default:
                        return "Review and implement best practices for this category.";
                    }
                    return "Implement best practices for this check to improve your cluster reliability and efficiency.";
                  })();
                  
                  const listItem = document.createElement('li');
                  listItem.textContent = recommendation;
                  listItem.style.fontSize = '14px';
                  listItem.style.color = '#2563EB'; // blue-600
                  listItem.style.margin = '8px 0';
                  recommendationsList.appendChild(listItem);
                });
                
                recommendationsBox.appendChild(recommendationsList);
                recommendationsSection.appendChild(recommendationsBox);
                recommendationsGroup.appendChild(recommendationsSection);
              } else if (category.checks && category.checks.length > 0) {
                // All checks passing message
                const allPassingDiv = document.createElement('div');
                allPassingDiv.style.marginTop = '20px';
                allPassingDiv.style.padding = '15px';
                allPassingDiv.style.backgroundColor = '#F0FDF4'; // green-50
                allPassingDiv.style.border = '1px solid #DCFCE7'; // green-100
                allPassingDiv.style.borderRadius = '8px';
                allPassingDiv.style.textAlign = 'center';
                
                const allPassingText = document.createElement('p');
                allPassingText.textContent = 'All checks are passing for this category. Continue maintaining these best practices.';
                allPassingText.style.fontSize = '14px';
                allPassingText.style.color = '#16A34A'; // green-600
                allPassingText.style.margin = '0';
                allPassingDiv.appendChild(allPassingText);
                
                recommendationsGroup.appendChild(allPassingDiv);
              }
              
              sectionContainer.appendChild(recommendationsGroup);
              
              // Add divider after each section except the last one
              if (i < categoryIds.length - 1) {
                const divider = document.createElement('hr');
                divider.style.margin = '30px 0';
                divider.style.border = 'none';
                divider.style.borderTop = '1px solid #E2E8F0';
                sectionContainer.appendChild(divider);
              }
              
              // Add section to content container
              contentContainer.appendChild(sectionContainer);
            }
            
            // Add to document body temporarily
            document.body.appendChild(contentContainer);
            
            try {
              // Process each section carefully to maintain page breaks
              await processPdfSections(contentContainer, pdf);
              
              // Remove content container from body
              document.body.removeChild(contentContainer);
              
              // Finalize the PDF
              finalizePdf(pdf);
            } catch (error) {
              console.error('Error processing PDF sections:', error);
              if (document.body.contains(contentContainer)) {
                document.body.removeChild(contentContainer);
              }
              setExpandedCategories(originalExpandedState);
              setIsGeneratingReport(false);
            }
          };
          
          // Function to process sections with smart page breaks
          const processPdfSections = async (container, pdf) => {
            try {
              // Define page margins and dimensions
              const margin = 15; // 15mm margin
              const pageWidth = pdf.internal.pageSize.getWidth();
              const pageHeight = pdf.internal.pageSize.getHeight();
              const contentWidth = pageWidth - (2 * margin);
              const contentHeight = pageHeight - (2 * margin);
              
              // Get all the sections to be processed
              const categoryContainers = container.querySelectorAll('[data-section="true"]');
              
              // Make sure we have the title page
              if (pdf.getNumberOfPages() === 0) {
                pdf.addPage();
              }
              
              // For each category, we'll create a new page and render its components separately
              for (let i = 0; i < categoryContainers.length; i++) {
                const categoryContainer = categoryContainers[i];
                
                // Add a new page for each category
                pdf.addPage();
                let yPosition = margin;
                
                // 1. Render the category header
                const categoryHeader = categoryContainer.querySelector(':scope > div:first-child');
                if (categoryHeader) {
                  const tempHeaderContainer = document.createElement('div');
                  tempHeaderContainer.style.width = `${contentWidth}mm`;
                  tempHeaderContainer.style.padding = '0';
                  tempHeaderContainer.style.margin = '0';
                  tempHeaderContainer.style.position = 'absolute';
                  tempHeaderContainer.style.left = '-9999px';
                  tempHeaderContainer.appendChild(categoryHeader.cloneNode(true));
                  document.body.appendChild(tempHeaderContainer);
                  
                  const headerCanvas = await html2canvas(tempHeaderContainer, {
                    scale: 2,
                    logging: false,
                    useCORS: true,
                    allowTaint: true
                  });
                  
                  document.body.removeChild(tempHeaderContainer);
                  
                  // Calculate dimensions in PDF units
                  const headerWidth = contentWidth;
                  const headerHeight = (headerCanvas.height * headerWidth) / headerCanvas.width;
                  
                  // Add header to PDF
                  pdf.addImage(
                    headerCanvas.toDataURL('image/jpeg', 0.95),
                    'JPEG',
                    margin,
                    yPosition,
                    headerWidth,
                    headerHeight,
                    undefined,
                    'FAST'
                  );
                  
                  yPosition += headerHeight + 5; // Add some space after header
                }
                
                // 2. Render the "Check Results" title
                const checksHeading = categoryContainer.querySelector(':scope > h3:nth-of-type(1)');
                if (checksHeading) {
                  const tempHeadingContainer = document.createElement('div');
                  tempHeadingContainer.style.width = `${contentWidth}mm`;
                  tempHeadingContainer.style.padding = '0';
                  tempHeadingContainer.style.margin = '0';
                  tempHeadingContainer.style.position = 'absolute';
                  tempHeadingContainer.style.left = '-9999px';
                  tempHeadingContainer.appendChild(checksHeading.cloneNode(true));
                  document.body.appendChild(tempHeadingContainer);
                  
                  const headingCanvas = await html2canvas(tempHeadingContainer, {
                    scale: 2,
                    logging: false
                  });
                  
                  document.body.removeChild(tempHeadingContainer);
                  
                  const headingWidth = contentWidth;
                  const headingHeight = (headingCanvas.height * headingWidth) / headingCanvas.width;
                  
                  // Add heading to PDF
                  pdf.addImage(
                    headingCanvas.toDataURL('image/jpeg', 0.95),
                    'JPEG',
                    margin,
                    yPosition,
                    headingWidth,
                    headingHeight,
                    undefined,
                    'FAST'
                  );
                  
                  yPosition += headingHeight + 5;
                }
                
                // 3. Render each check group separately to avoid page breaks
                const checkGroups = categoryContainer.querySelectorAll('[data-check-group="true"]');
                
                // Skip the last check group (recommendations) - we'll handle it separately
                // Process all the regular check groups first (all but the last one)
                for (let j = 0; j < checkGroups.length - 1; j++) {
                  const checkGroup = checkGroups[j];
                  
                  // Skip empty groups
                  if (!checkGroup.children || checkGroup.children.length === 0) continue;
                  
                  const tempGroupContainer = document.createElement('div');
                  tempGroupContainer.style.width = `${contentWidth}mm`;
                  tempGroupContainer.style.padding = '0';
                  tempGroupContainer.style.margin = '0';
                  tempGroupContainer.style.position = 'absolute';
                  tempGroupContainer.style.left = '-9999px';
                  
                  const groupClone = checkGroup.cloneNode(true);
                  tempGroupContainer.appendChild(groupClone);
                  document.body.appendChild(tempGroupContainer);
                  
                  const groupCanvas = await html2canvas(tempGroupContainer, {
                    scale: 2,
                    logging: false,
                    useCORS: true,
                    allowTaint: true
                  });
                  
                  document.body.removeChild(tempGroupContainer);
                  
                  const groupWidth = contentWidth;
                  const groupHeight = (groupCanvas.height * groupWidth) / groupCanvas.width;
                  
                  // Check if the group will fit on the current page
                  if (yPosition + groupHeight > pageHeight - margin) {
                    // Doesn't fit, add a new page
                    pdf.addPage();
                    yPosition = margin;
                  }
                  
                  // Add group to PDF
                  pdf.addImage(
                    groupCanvas.toDataURL('image/jpeg', 0.95),
                    'JPEG',
                    margin,
                    yPosition,
                    groupWidth,
                    groupHeight,
                    undefined,
                    'FAST'
                  );
                  
                  yPosition += groupHeight + 10;
                }
                
                // 4. Now handle the recommendations section specifically (it's the last check group)
                if (checkGroups.length > 0) {
                  const recommendationsGroup = checkGroups[checkGroups.length - 1];
                  
                  // Find the recommendations title if it exists
                  const recommendationsTitle = recommendationsGroup.querySelector('h3');
                  
                  // Find either the recommendations-box or the all-passing div
                  const recommendationsBox = recommendationsGroup.querySelector('.recommendations-box');
                  const allPassingDiv = recommendationsBox ? null : recommendationsGroup.querySelector('div');
                  const contentElement = recommendationsBox || allPassingDiv;
                  
                  if (contentElement) {
                    // Create a container that holds both the title and content to keep them together
                    const tempBoxContainer = document.createElement('div');
                    tempBoxContainer.style.width = `${contentWidth}mm`;
                    tempBoxContainer.style.padding = '0';
                    tempBoxContainer.style.margin = '0';
                    tempBoxContainer.style.position = 'absolute';
                    tempBoxContainer.style.left = '-9999px';
                    
                    // Add the title if it exists (important: need to add title before content to keep them together)
                    if (recommendationsTitle) {
                      tempBoxContainer.appendChild(recommendationsTitle.cloneNode(true));
                      // Add a small vertical spacer between title and box
                      const spacer = document.createElement('div');
                      spacer.style.height = '5px';
                      tempBoxContainer.appendChild(spacer);
                    }
                    
                    // Add the content below the title
                    tempBoxContainer.appendChild(contentElement.cloneNode(true));
                    
                    document.body.appendChild(tempBoxContainer);
                    
                    const boxCanvas = await html2canvas(tempBoxContainer, {
                      scale: 2,
                      logging: false,
                      useCORS: true,
                      allowTaint: true
                    });
                    
                    document.body.removeChild(tempBoxContainer);
                    
                    const boxWidth = contentWidth;
                    const boxHeight = (boxCanvas.height * boxWidth) / boxCanvas.width;
                    
                    // Check if the box fits on the current page
                    if (yPosition + boxHeight > pageHeight - margin) {
                      // Doesn't fit, add a new page
                      pdf.addPage();
                      yPosition = margin;
                    }
                    
                    // Add recommendations box to PDF
                    pdf.addImage(
                      boxCanvas.toDataURL('image/jpeg', 0.95),
                      'JPEG',
                      margin,
                      yPosition,
                      boxWidth,
                      boxHeight,
                      undefined,
                      'FAST'
                    );
                    
                    yPosition += boxHeight + 10;
                  }
                }
              }
              
              return pdf;
            } catch (error) {
              console.error("Error in processPdfSections:", error);
              throw error;
            }
          };
          
          // Final function to save the PDF
          const finalizePdf = (pdf) => {
            // Create a more descriptive filename using cluster name and current date
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
            
            let filename = 'kubernetes-best-practices';
            
            // Use props first if available (from main page), fallback to analysis results
            const effectiveClusterName = clusterName || (analysisResults && analysisResults.cluster_name) || '';
            const effectiveClusterId = clusterId || (analysisResults && analysisResults.cluster_id) || '';
            
            if (effectiveClusterName) {
              filename = `${effectiveClusterName.replace(/\s+/g, '-')}-best-practices`;
              
            }
            
            // Always add the date suffix to make the filename unique
            filename += `-${dateStr}`;
            
            // Save the PDF with the appropriate filename
            pdf.save(`${filename}.pdf`);
            
            // Restore the original expanded state
            setExpandedCategories(originalExpandedState);
            setIsGeneratingReport(false);
          };
          
        } catch (error) {
          console.error('Error in PDF generation:', error);
          // Restore the original expanded state
          setExpandedCategories(originalExpandedState);
          setIsGeneratingReport(false);
        }
      }, 100); // Wait 100ms for the DOM to update
    } catch (error) {
      console.error('Error setting up PDF generation:', error);
      setIsGeneratingReport(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md max-w-5xl mx-auto overflow-auto max-h-[calc(100vh-40px)]">
      <div className="p-5 border-b flex justify-between items-center">
        <div className="flex items-center">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">Kubernetes Best Practices Analysis</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onReanalyze}
            className="flex items-center px-3 py-1.5 text-sm border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Re-analyze
              </>
            )}
          </button>
          
          <button
            onClick={generateReport}
            className="flex items-center px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
            disabled={isLoading || isGeneratingReport}
          >
            {isGeneratingReport ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </>
            )}
          </button>
        </div>
      </div>
      
      {!analysisResults && !isLoading ? (
        <div className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Analysis Results</h3>
          <p className="text-gray-600 mb-6">
            Best practices analysis has not been run yet. Click "Re-analyze" to analyze your cluster.
          </p>
          <button
            onClick={onReanalyze}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 mx-auto"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Analysis
          </button>
        </div>
      ) : isLoading ? (
        <div className="p-8 text-center">
          <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium mb-2">Analyzing Cluster...</h3>
          <p className="text-gray-600">
            Evaluating your resources against Kubernetes best practices...
          </p>
        </div>
      ) : (
        <div className="p-5" ref={reportContainerRef}>
          {/* Overall Score Section */}
          <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 mb-6">
            <div className="flex items-center mb-4">
              <div className="bg-white rounded-full p-2.5 mr-4 shadow-sm">
                <span className={`text-3xl font-bold ${getScoreColor(analysisResults.overall_score)}`}>
                  {analysisResults.overall_score}%
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Overall Compliance Score</h3>
                <p className="text-sm text-gray-500">Based on analysis against Kubernetes best practices guide</p>
              </div>
            </div>
            <p className="text-gray-700 text-sm">
              This score represents your cluster's overall compliance with recommended best practices for running applications on Kubernetes. 
              Review the categories below to identify areas for improvement.
            </p>
          </div>

          {/* Categories Section */}
          <h3 className="text-lg font-bold mb-4">Category Results</h3>
          
          {/* Map through each category */}
          {analysisResults && analysisResults.categories && 
            Object.entries(analysisResults.categories).map(([categoryId, category]) => {
              if (!category) return null;
              
              const isExpanded = expandedCategories[categoryId];
              return (
                <div key={categoryId} className={`border rounded-lg overflow-hidden ${getScoreBgColor(category.score)}`}>
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => toggleCategory(categoryId)}
                    aria-expanded={isExpanded ? "true" : "false"}
                  >
                    <div className="flex items-center">
                      {getScoreIcon(category.score)}
                      <h3 className="ml-3 font-semibold">{getCategoryDisplayName(categoryId)}</h3>
                      <div className={`ml-3 px-2 py-1 rounded-full text-xs font-bold ${getScoreColor(category.score)}`}>
                        {category.score}%
                      </div>
                    </div>
                    <div className="flex items-center">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="p-4 border-t bg-white" data-expandable="true">
                      <p className="text-sm text-gray-700 mb-4">
                        {getCategoryRecommendation(categoryId)}
                      </p>
                      
                      <h4 className="font-medium text-sm mb-2">Check Results:</h4>
                      <div className="space-y-2 mb-4">
                        {category.checks && category.checks.map((check, index) => {
                          const percentage = extractPercentage(check.details);
                          let statusIcon;
                          let bgColor;
                          
                          // Special case for Pod anti-affinity with inverted thresholds
                          if (check.name === "Pod anti-affinity") {
                            if (percentage <= 30) {
                              statusIcon = <CheckCircle className="w-4 h-4 text-green-600" />;
                              bgColor = 'bg-green-50';
                            } else if (percentage <= 70) {
                              statusIcon = <AlertCircle className="w-4 h-4 text-yellow-600" />;
                              bgColor = 'bg-yellow-50';
                            } else {
                              statusIcon = <XCircle className="w-4 h-4 text-red-600" />;
                              bgColor = 'bg-red-50';
                            }
                          } else {
                            // Regular checks
                            if (check.passed || percentage >= 70) {
                              statusIcon = <CheckCircle className="w-4 h-4 text-green-600" />;
                              bgColor = 'bg-green-50';
                            } else if (percentage >= 40) {
                              statusIcon = <AlertCircle className="w-4 h-4 text-yellow-600" />;
                              bgColor = 'bg-yellow-50';
                            } else {
                              statusIcon = <XCircle className="w-4 h-4 text-red-600" />;
                              bgColor = 'bg-red-50';
                            }
                          }
                          
                          return (
                            <div 
                              key={index}
                              className={`p-3 rounded-md ${bgColor}`}
                            >
                              <div className="flex items-start">
                                <div className="flex-shrink-0 mt-0.5">
                                  {statusIcon}
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium">
                                    {check.name}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {check.details}
                                  </p>
                                  {check.explanation && (
                                    <p className="text-xs text-gray-600 mt-2">
                                      <span className="font-medium">Explanation: </span>
                                      {check.explanation}
                                    </p>
                                  )}
                                  {check.name.includes("Pod anti-affinity") && (
                                    <p className="text-xs text-gray-600 mt-2">
                                      {check.name.includes("Required") ? (
                                        <span className="text-blue-600">Required ({extractPercentage(check.details)}%) - for critical workloads that must be spread across nodes</span>
                                      ) : check.name.includes("Preferred") ? (
                                        <span className="text-purple-600">Preferred ({extractPercentage(check.details)}%) - for non-critical workloads where spreading is beneficial but not essential</span>
                                      ) : ""}
                                    </p>
                                  )}
                                  {check.recommendation && (
                                    <p className="text-xs text-green-600 mt-2">
                                      <span className="font-medium">Recommendation: </span>
                                      {check.recommendation}
                                    </p>
                                  )}
                                  {check.reference && (
                                    <a 
                                      href={check.reference} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-xs text-blue-500 flex items-center mt-2 hover:underline"
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Learn more
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="font-medium text-sm mb-2">Recommendations:</h4>
                        <div className="bg-blue-50 p-3 rounded-md">
                          {category.checks && category.checks.filter(check => !check.passed).length > 0 ? (
                            <ul className="list-disc pl-5 text-sm space-y-2">
                              {category.checks.filter(check => !check.passed).map((check, index) => {
                                // Prefer the backend recommendation if available
                                const recommendation = check.recommendation || (() => {
                                  // The existing code for generating recommendations as fallback
                                  switch(categoryId) {
                                    case 'resiliency':
                                      if (check.name.includes("Multi-zone")) {
                                        return "Deploy applications across multiple availability zones to improve fault tolerance.";
                                      } else if (check.name.includes("Health checks")) {
                                        return "Implement liveness, readiness, and startup probes for all workloads.";
                                      } else if (check.name.includes("Graceful termination")) {
                                        return "Configure preStop hooks and appropriate terminationGracePeriodSeconds.";
                                      }
                                      break;
                                    case 'workload':
                                      if (check.name.includes("Resource requests")) {
                                        return "Define CPU and memory requests for all containers based on actual usage patterns.";
                                      } else if (check.name.includes("Resource limits")) {
                                        return "Set memory limits equal to requests to ensure guaranteed QoS class. Consider using a LimitRange.";
                                      }
                                      break;
                                    case 'pdb':
                                      if (check.name.includes("PDB coverage")) {
                                        return "Implement PDBs for all stateful applications and critical workloads.";
                                      } else if (check.name.includes("PDB configuration")) {
                                        return "Review PDB settings to ensure they don't block node draining. Use maxUnavailable rather than minAvailable where appropriate.";
                                      }
                                      break;
                                    case 'topology':
                                      if (check.name.includes("Topology constraints")) {
                                        return "Implement topology spread constraints for even pod distribution across failure domains.";
                                      } else if (check.name.includes("Pod anti-affinity") && check.name.includes("Required")) {
                                        return "Configure required pod anti-affinity for critical stateful workloads with low replica counts (2-3).";
                                      } else if (check.name.includes("Pod anti-affinity") && check.name.includes("Preferred")) {
                                        return "Use preferred pod anti-affinity for non-critical workloads to balance distribution while allowing scheduling flexibility.";
                                      } else if (check.name.includes("Pod anti-affinity")) {
                                        return "Configure pod anti-affinity for workloads to ensure proper distribution across nodes.";
                                      }
                                      break;
                                    case 'security':
                                      if (check.name.includes("Network policies")) {
                                        return "Implement default deny network policies and explicitly allow required traffic.";
                                      } else if (check.name.includes("Security context")) {
                                        return "Configure security contexts to run containers as non-root with appropriate capabilities.";
                                      }
                                      break;
                                    case 'network':
                                      if (check.name.includes("Service Topology")) {
                                        return "Implement topologyKeys in Service definitions to optimize traffic routing.";
                                      }
                                      break;
                                    case 'secrets':
                                      if (check.name.includes("Secret management")) {
                                        return "Use external secrets management solutions (e.g., Vault, cloud provider solutions).";
                                      }
                                      break;
                                    case 'observability':
                                      return "Enhance observability by implementing comprehensive metrics, logging, and tracing.";
                                    default:
                                      return "Review and implement best practices for this category.";
                                  }
                                })();
                                
                                return (
                                  <li key={index}>{recommendation}</li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-600">
                              All checks are passing for this category. Continue maintaining these best practices.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default BestPracticesDetailView; 