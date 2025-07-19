import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, AlertCircle, XCircle, Download, Loader2, HelpCircle, ExternalLink, ChevronDown, RotateCcw } from 'lucide-react';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// Best practices categories from the documentation
const BEST_PRACTICE_CATEGORIES = [
  { id: 'resiliency', label: 'Resiliency', tooltip: 'Measures implementation of multi-zone deployments, health checks, and graceful termination' },
  { id: 'workload', label: 'Workload Sizing', tooltip: 'Checks if workloads have appropriate resource requests and limits defined' },
  { id: 'pdb', label: 'Pod Disruption Budget', tooltip: 'Evaluates if critical workloads have PDBs to maintain availability during cluster operations' },
  { id: 'topology', label: 'Topology Spread', tooltip: 'Checks if workloads use topology spread constraints and pod anti-affinity (required vs. preferred) for even distribution' },
  { id: 'security', label: 'Security', tooltip: 'Evaluates security measures like network policies, image scanning, and audit logging' },
  { id: 'network', label: 'Network Topology', tooltip: 'Measures implementation of network policies and service topology' },
  { id: 'secrets', label: 'Secrets Management', tooltip: 'Checks how secrets are managed and secured' },
  { id: 'observability', label: 'Observability', tooltip: 'Evaluates metrics collection, logging, and tracing infrastructure' }
];

const BestPracticesCard = ({ analysisResults, isAnalyzing, onViewDetails }) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [error, setError] = useState(null);
  const [showTooltip, setShowTooltip] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  
  // Function to generate and download a comprehensive report as PDF
  const generateReport = () => {
    if (!analysisResults) return;
    
    setIsGeneratingReport(true);
    
    try {
      // Save the current expanded state to restore later
      const originalExpandedState = expandedCategory;
      
      // Create a container for the report content with styles matching the UI
      const reportElement = document.createElement('div');
      reportElement.style.width = '800px';
      reportElement.style.padding = '40px';
      reportElement.style.fontFamily = 'Arial, sans-serif';
      reportElement.style.backgroundColor = '#ffffff';
      reportElement.style.position = 'absolute';
      reportElement.style.left = '-9999px';
      reportElement.style.boxSizing = 'border-box';
      
      // Title and header section
      const headerSection = document.createElement('div');
      headerSection.style.marginBottom = '30px';
      headerSection.style.textAlign = 'center';
      
      const title = document.createElement('h1');
      title.textContent = 'Kubernetes Best Practices Analysis Report';
      title.style.fontSize = '24px';
      title.style.fontWeight = 'bold';
      title.style.color = '#2D3748';
      title.style.marginBottom = '10px';
      headerSection.appendChild(title);
      
      const date = document.createElement('p');
      date.textContent = `Generated: ${new Date().toLocaleString()}`;
      date.style.fontSize = '14px';
      date.style.color = '#718096';
      headerSection.appendChild(date);
      
      reportElement.appendChild(headerSection);
      
      // Overall score section with UI-like styling
      const overallScoreSection = document.createElement('div');
      overallScoreSection.style.marginBottom = '30px';
      overallScoreSection.style.textAlign = 'center';

      // Score value with icon
      const scoreDisplay = document.createElement('div');
      scoreDisplay.style.display = 'flex';
      scoreDisplay.style.justifyContent = 'center';
      scoreDisplay.style.alignItems = 'center';
      scoreDisplay.style.marginBottom = '10px';

      let scoreColor;
      if (analysisResults.overall_score >= 70) {
        scoreColor = '#2F855A'; // green-600
      } else if (analysisResults.overall_score >= 40) {
        scoreColor = '#D69E2E'; // yellow-600
      } else {
        scoreColor = '#E53E3E'; // red-600
      }
      
      const scoreValue = document.createElement('span');
      scoreValue.textContent = `${analysisResults.overall_score}%`;
      scoreValue.style.fontSize = '36px';
      scoreValue.style.fontWeight = 'bold';
      scoreValue.style.color = scoreColor;
      scoreValue.style.marginRight = '10px';
      scoreDisplay.appendChild(scoreValue);
      
      // Icon based on score
      const scoreIcon = document.createElement('span');
      if (analysisResults.overall_score >= 70) {
        scoreIcon.textContent = '✅';
      } else if (analysisResults.overall_score >= 40) {
        scoreIcon.textContent = '⚠️';
      } else {
        scoreIcon.textContent = '❌';
      }
      scoreIcon.style.fontSize = '24px';
      scoreDisplay.appendChild(scoreIcon);
      
      overallScoreSection.appendChild(scoreDisplay);
      
      const scoreTitle = document.createElement('p');
      scoreTitle.textContent = 'Overall Best Practices Compliance';
      scoreTitle.style.fontSize = '14px';
      scoreTitle.style.color = '#718096';
      overallScoreSection.appendChild(scoreTitle);
      
      reportElement.appendChild(overallScoreSection);
      
      // Category breakdown section
      if (analysisResults.categories && Object.keys(analysisResults.categories).length > 0) {
        const categorySection = document.createElement('div');
        categorySection.style.marginBottom = '30px';
        
        const categorySectionTitle = document.createElement('h2');
        categorySectionTitle.textContent = 'Category Breakdown';
        categorySectionTitle.style.fontSize = '18px';
        categorySectionTitle.style.fontWeight = '600';
        categorySectionTitle.style.color = '#2D3748';
        categorySectionTitle.style.marginBottom = '15px';
        categorySection.appendChild(categorySectionTitle);
        
        // Grid for categories
        const categoriesGrid = document.createElement('div');
        categoriesGrid.style.display = 'grid';
        categoriesGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        categoriesGrid.style.gap = '16px';
        
        BEST_PRACTICE_CATEGORIES.forEach(category => {
          // Skip if the category isn't in the results
          if (!analysisResults.categories[category.id]) return;
          
          const categoryResults = analysisResults.categories[category.id];
          
          const categoryCard = document.createElement('div');
          categoryCard.style.backgroundColor = '#F7FAFC'; // gray-50
          categoryCard.style.padding = '12px';
          categoryCard.style.borderRadius = '6px';
          
          // Category header
          const categoryHeader = document.createElement('div');
          categoryHeader.style.display = 'flex';
          categoryHeader.style.justifyContent = 'space-between';
          categoryHeader.style.alignItems = 'center';
          categoryHeader.style.marginBottom = '8px';
          
          // Category name and tooltip info
          const categoryNameContainer = document.createElement('div');
          categoryNameContainer.style.display = 'flex';
          categoryNameContainer.style.alignItems = 'center';
          
          const categoryName = document.createElement('span');
          categoryName.textContent = category.label;
          categoryName.style.fontWeight = '500';
          categoryName.style.color = '#2D3748';
          categoryNameContainer.appendChild(categoryName);
          
          // Tooltip text in parentheses
          const tooltipText = document.createElement('span');
          tooltipText.textContent = ` (${category.tooltip})`;
          tooltipText.style.fontSize = '12px';
          tooltipText.style.color = '#718096';
          categoryNameContainer.appendChild(tooltipText);
          
          categoryHeader.appendChild(categoryNameContainer);
          
          // Score display
          const scoreDisplay = document.createElement('div');
          scoreDisplay.style.display = 'flex';
          scoreDisplay.style.alignItems = 'center';
          
          let scoreColor, scoreIcon;
          if (categoryResults.score >= 70) {
            scoreColor = '#2F855A'; // green-600
            scoreIcon = '✅';
          } else if (categoryResults.score >= 40) {
            scoreColor = '#D69E2E'; // yellow-600
            scoreIcon = '⚠️';
          } else {
            scoreColor = '#E53E3E'; // red-600
            scoreIcon = '❌';
          }
          
          const scoreText = document.createElement('span');
          scoreText.textContent = `${categoryResults.score}%`;
          scoreText.style.fontWeight = 'bold';
          scoreText.style.color = scoreColor;
          scoreText.style.marginRight = '5px';
          scoreDisplay.appendChild(scoreText);
          
          const iconSpan = document.createElement('span');
          iconSpan.textContent = scoreIcon;
          scoreDisplay.appendChild(iconSpan);
          
          categoryHeader.appendChild(scoreDisplay);
          categoryCard.appendChild(categoryHeader);
          
          // Progress bar
          const progressBarContainer = document.createElement('div');
          progressBarContainer.style.height = '8px';
          progressBarContainer.style.backgroundColor = '#E2E8F0'; // gray-200
          progressBarContainer.style.borderRadius = '4px';
          progressBarContainer.style.overflow = 'hidden';
          progressBarContainer.style.marginBottom = '12px';
          
          const progressBar = document.createElement('div');
          progressBar.style.height = '100%';
          progressBar.style.width = `${categoryResults.score}%`;
          
          if (categoryResults.score >= 70) {
            progressBar.style.backgroundColor = '#48BB78'; // green-500
          } else if (categoryResults.score >= 40) {
            progressBar.style.backgroundColor = '#ECC94B'; // yellow-500
          } else {
            progressBar.style.backgroundColor = '#F56565'; // red-500
          }
          
          progressBarContainer.appendChild(progressBar);
          categoryCard.appendChild(progressBarContainer);
          
          // Checks summary (expanded to show all checks)
          if (categoryResults.checks && categoryResults.checks.length > 0) {
            const checksContainer = document.createElement('div');
            checksContainer.setAttribute('data-expandable', 'true');
            
            const checksInfo = document.createElement('div');
            checksInfo.textContent = `${categoryResults.checks.length} checks performed`;
            checksInfo.style.fontSize = '12px';
            checksInfo.style.color = '#718096';
            checksInfo.style.marginBottom = '8px';
            checksContainer.appendChild(checksInfo);
            
            const checksList = document.createElement('div');
            checksList.style.display = 'flex';
            checksList.style.flexDirection = 'column';
            checksList.style.gap = '6px';
            
            categoryResults.checks.forEach((check, index) => {
              const checkItem = document.createElement('div');
              checkItem.style.display = 'flex';
              checkItem.style.alignItems = 'flex-start';
              
              const checkIcon = document.createElement('span');
              if (check.name === "Pod anti-affinity") {
                // Extract percentage and use special anti-affinity icon logic with inverted thresholds
                const percentage = check.details.match(/(\d+)%/) ? parseInt(check.details.match(/(\d+)%/)[1]) : 0;
                if (percentage <= 30) {
                  checkIcon.textContent = '✅'; // Green check for low anti-affinity (good)
                  checkIcon.style.color = '#2F855A'; // green-600
                } else if (percentage <= 70) {
                  checkIcon.textContent = '⚠️'; // Yellow warning for medium anti-affinity
                  checkIcon.style.color = '#D69E2E'; // yellow-600
                } else {
                  checkIcon.textContent = '❌'; // Red X for high anti-affinity (bad)
                  checkIcon.style.color = '#E53E3E'; // red-600
                }
              } else {
                // Regular icon logic
                if (check.passed) {
                  checkIcon.textContent = '✅';
                  checkIcon.style.color = '#2F855A'; // green-600
                } else {
                  checkIcon.textContent = '❌';
                  checkIcon.style.color = '#E53E3E'; // red-600
                }
              }
              
              checkIcon.style.marginRight = '6px';
              checkIcon.style.fontSize = '14px';
              checkItem.appendChild(checkIcon);
              
              const checkText = document.createElement('span');
              
              // Enhanced text for pod anti-affinity checks to show required vs preferred with percentages
              if (check.name.includes("Pod anti-affinity")) {
                // Extract percentage from details
                const percentageMatch = check.details.match(/(\d+)%/);
                const percentage = percentageMatch ? percentageMatch[1] : '0';
                
                if (check.name.includes("Required")) {
                  checkText.textContent = `${check.name} (required: ${percentage}%)`;
                } else if (check.name.includes("Preferred")) {
                  checkText.textContent = `${check.name} (preferred: ${percentage}%)`;
                } else {
                  checkText.textContent = check.name;
                }
              } else {
                checkText.textContent = check.name;
              }
              
              checkText.style.fontSize = '12px';
              checkText.style.color = '#4A5568';
              checkItem.appendChild(checkText);
              
              checksList.appendChild(checkItem);
            });
            
            checksContainer.appendChild(checksList);
            categoryCard.appendChild(checksContainer);
          }
          
          categoriesGrid.appendChild(categoryCard);
        });
        
        categorySection.appendChild(categoriesGrid);
        reportElement.appendChild(categorySection);
      }
      
      // Footer
      const footer = document.createElement('div');
      footer.style.marginTop = '30px';
      footer.style.borderTop = '1px solid #E2E8F0';
      footer.style.paddingTop = '20px';
      footer.style.fontSize = '12px';
      footer.style.color = '#718096';
      footer.style.textAlign = 'center';
      
      const footerText = document.createElement('p');
      footerText.textContent = `Generated by Kubernetes Best Practices Analyzer on ${new Date().toLocaleDateString()}`;
      footer.appendChild(footerText);
      
      reportElement.appendChild(footer);
      
      // Add the report element to the document
      document.body.appendChild(reportElement);
      
      // Set up PDF generation with improved options for smaller file size
      html2canvas(reportElement, {
        scale: 1.2, // Reduced from 2.0 to 1.2 for better balance of quality and size
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          // You can modify the cloned document before rendering if needed
          const clonedElement = clonedDoc.body.querySelector('div');
          clonedElement.style.position = 'relative';
          clonedElement.style.left = '0px';
          
          // Ensure all content is visible
          const expandableSections = clonedDoc.querySelectorAll('[data-expandable="true"]');
          expandableSections.forEach(section => {
            section.style.display = 'block';
          });
        },
        letterRendering: false, // Disable letter rendering for better performance
        allowTaint: true, // Allow cross-origin images
      }).then(canvas => {
        document.body.removeChild(reportElement);
        
        // Use lower quality for the image to reduce file size
        const imgData = canvas.toDataURL('image/jpeg', 0.75); // Using JPEG instead of PNG with 75% quality
        const pdf = new jsPDF({
          unit: 'mm',
          format: 'a4',
          compress: true // Enable compression
        });
        
        // Calculate dimensions to fit the image on A4
        const imgWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Multi-page handling with better approach
        const pageHeight = pdf.internal.pageSize.getHeight();
        let remainingHeight = imgHeight;
        let position = 0;
        
        // Add first page
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, null, 'FAST');
        remainingHeight -= pageHeight;
        
        // Add subsequent pages if needed
        while (remainingHeight > 0) {
          pdf.addPage();
          // Position image negative to show the next part
          pdf.addImage(imgData, 'JPEG', 0, -pageHeight * (imgHeight - remainingHeight) / imgHeight, imgWidth, imgHeight, null, 'FAST');
          remainingHeight -= pageHeight;
        }
        
        // Create filename using cluster name and ID if available
        let filename = 'kubernetes-best-practices-report';
        
        // Check if cluster name and ID are available in the analysis results
        if (analysisResults.cluster_name) {
          filename = `${analysisResults.cluster_name}`;
          
          // Add cluster ID if available
          if (analysisResults.cluster_id) {
            filename += `-${analysisResults.cluster_id}`;
          }
        } else {
          // Fallback to date if no cluster information is available
          filename += `-${new Date().toISOString().split('T')[0]}`;
        }
        
        // Save the PDF with the appropriate filename
        pdf.save(`${filename}.pdf`);
        
        // Restore the original expanded category
        setExpandedCategory(originalExpandedState);
        setIsGeneratingReport(false);
      }).catch(err => {
        console.error('Error generating PDF:', err);
        setError(`Failed to generate PDF: ${err.message}`);
        // Restore original state
        setExpandedCategory(originalExpandedState);
        setIsGeneratingReport(false);
      });
    } catch (err) {
      console.error('Error in report generation:', err);
      setError(`Failed to generate PDF: ${err.message}`);
      setIsGeneratingReport(false);
    }
  };
  
  // Handle category expansion
  const toggleCategoryExpansion = (categoryId) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
    }
  };
  
  // Score color based on value
  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  // Icon based on score
  const getScoreIcon = (score) => {
    if (score >= 70) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 40) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };
  
  // Special score color for pod anti-affinity with inverted thresholds
  const getAntiAffinityScoreColor = (score) => {
    if (score <= 30) return 'text-green-600';
    if (score <= 70) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  // Special icon for pod anti-affinity with inverted thresholds
  const getAntiAffinityScoreIcon = (score) => {
    if (score <= 30) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score <= 70) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };
  
  // Handle tooltip display
  const handleTooltipHover = (categoryId) => {
    setShowTooltip(categoryId);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b">
        <h3 className="text-lg font-medium">Best Practices Analysis</h3>
        <p className="text-sm text-gray-500">
          Analysis of cluster resources against Kubernetes best practices
        </p>
      </div>
      
      <div className="p-4">
        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-700 rounded-md text-sm mb-4">
            {error}
          </div>
        )}
        
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-500">Analyzing cluster against best practices...</p>
          </div>
        ) : analysisResults && analysisResults.overall_score !== undefined ? (
          <div>
            {/* Overall Score */}
            <div className="mb-6 text-center">
              <div className="text-3xl font-bold mb-2 flex items-center justify-center">
                <span className={`mr-2 ${getScoreColor(analysisResults.overall_score)}`}>
                  {analysisResults.overall_score}%
                </span>
                {getScoreIcon(analysisResults.overall_score)}
              </div>
              <p className="text-sm text-gray-500">Overall Best Practices Compliance</p>
            </div>
            
            {/* Category Scores - only show if we have categories */}
            {analysisResults.categories && Object.keys(analysisResults.categories).length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3">Category Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {BEST_PRACTICE_CATEGORIES.map(category => {
                    // Skip if the category isn't in the results
                    if (!analysisResults.categories[category.id]) return null;
                    
                    const categoryResults = analysisResults.categories[category.id];
                    const isExpanded = expandedCategory === category.id;
                    
                    return (
                      <div key={category.id} className="bg-gray-50 p-3 rounded-md">
                        <div 
                          className="flex items-center justify-between mb-2 cursor-pointer"
                          onClick={() => toggleCategoryExpansion(category.id)}
                        >
                          <div className="flex items-center">
                            <span className="font-medium">{category.label}</span>
                            <div className="relative ml-1" onMouseEnter={() => handleTooltipHover(category.id)} onMouseLeave={() => handleTooltipHover('')}>
                              <HelpCircle className="w-4 h-4 text-gray-400" />
                              {showTooltip === category.id && (
                                <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-md shadow-lg w-64">
                                  {category.tooltip}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className={`font-bold ${getScoreColor(categoryResults.score)}`}>
                              {categoryResults.score}%
                            </span>
                            <span className="ml-2">
                              {getScoreIcon(categoryResults.score)}
                            </span>
                            <ChevronDown className={`ml-1 w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} />
                          </div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded overflow-hidden">
                          <div 
                            className={`h-full ${
                              categoryResults.score >= 70 ? 'bg-green-500' : 
                              categoryResults.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`} 
                            style={{ width: `${categoryResults.score}%` }}
                          />
                        </div>
                        
                        {isExpanded && categoryResults.checks && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-xs text-gray-600 mb-2">
                              {categoryResults.checks.length} checks performed
                            </div>
                            <div className="space-y-1.5">
                              {categoryResults.checks.map((check, index) => (
                                <div key={index} className="flex items-start">
                                  {check.name === "Pod anti-affinity" ? (
                                    // Use the special anti-affinity icon logic with inverted thresholds
                                    (() => {
                                      const percentage = check.details.match(/(\d+)%/) ? parseInt(check.details.match(/(\d+)%/)[1]) : 0;
                                      if (percentage <= 30) {
                                        return <CheckCircle className="flex-shrink-0 w-3.5 h-3.5 text-green-500 mt-0.5 mr-1.5" />;
                                      } else if (percentage <= 70) {
                                        return <AlertCircle className="flex-shrink-0 w-3.5 h-3.5 text-yellow-500 mt-0.5 mr-1.5" />;
                                      } else {
                                        return <XCircle className="flex-shrink-0 w-3.5 h-3.5 text-red-500 mt-0.5 mr-1.5" />;
                                      }
                                    })()
                                  ) : (
                                    // Regular icon logic
                                    check.passed ? (
                                      <CheckCircle className="flex-shrink-0 w-3.5 h-3.5 text-green-500 mt-0.5 mr-1.5" />
                                    ) : (
                                      <XCircle className="flex-shrink-0 w-3.5 h-3.5 text-red-500 mt-0.5 mr-1.5" />
                                    )
                                  )}
                                  <span className="text-xs">
                                    {check.name.includes("Pod anti-affinity") ? (
                                      <>
                                        {check.name}
                                        {check.name.includes("Required") && (
                                          <span className="inline-block ml-1 text-xs text-blue-600">
                                            (required: {check.details.match(/(\d+)%/) ? check.details.match(/(\d+)%/)[1] : '0'}%)
                                          </span>
                                        )}
                                        {check.name.includes("Preferred") && (
                                          <span className="inline-block ml-1 text-xs text-purple-600">
                                            (preferred: {check.details.match(/(\d+)%/) ? check.details.match(/(\d+)%/)[1] : '0'}%)
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      check.name
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={onViewDetails}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Detailed Analysis
              </button>
              
              <button
                onClick={generateReport}
                disabled={!analysisResults || isGeneratingReport}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
              >
                {isGeneratingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Export PDF Report
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-10 h-10 text-yellow-500 mb-4" />
            <p className="text-gray-600 font-medium mb-2">No Analysis Results Available</p>
            <p className="text-gray-500 mb-4 text-center">The best practices analysis has not been performed yet.</p>
            <button
              onClick={onViewDetails}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Run Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BestPracticesCard; 