/**
 * Configuration Utilities - Extension
 * 
 * A set of utility functions extending the ConfigUtils functionality
 */

// Add a custom selector capability for text content matching
if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

// Instead of trying to extend querySelectorAll with :contains, provide a helper function
document.addEventListener('DOMContentLoaded', function() {
    // Add containsText helper to ConfigUtils
    ConfigUtils.containsText = function(selector, text) {
        const elements = document.querySelectorAll(selector);
        const result = [];
        
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].textContent.includes(text)) {
                result.push(elements[i]);
            }
        }
        
        return result;
    };
    
    // Add findElementWithText helper to ConfigUtils
    ConfigUtils.findElementWithText = function(selector, text) {
        const elements = document.querySelectorAll(selector);
        
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].textContent.includes(text)) {
                return elements[i];
            }
        }
        
        return null;
    };
    
    console.log('ConfigUtils extensions loaded - text search helpers added');
});
