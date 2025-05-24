/**
 * json-cleaner.js
 * Utility functions for cleaning parsed JSON data, typically from a "vuelta" message.
 */

const occurrenceFixer = require('./occurrence-fixer'); // For ensuring correct structure before cleaning

/**
 * Defines what constitutes an "empty" or "default" value for filtering.
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is considered empty/default, false otherwise.
 */
function isValueEmptyOrDefaultForFilter(value) {
  if (value === "" || value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === "") return true; // All whitespace
  if (typeof value === 'string' && /^0+$/.test(value)) return true; // All zeros
  // Note: number 0 is not considered empty here, only string "0", "00" etc.
  return false;
}

/**
 * Recursively removes fields that are empty or contain default "empty" values.
 * Also cleans up empty objects/arrays resulting from filtering.
 * @param {Object|Array} data - The data to filter.
 * @returns {Object|Array} The filtered data.
 */
function filterAllEmptyFields(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data
      .map(item => filterAllEmptyFields(item))
      .filter(item => {
        if (item === null || item === undefined) return false;
        if (typeof item === 'object' && Object.keys(item).length === 0) return false;
        // We should NOT keep items that only have an 'index' property
        if (typeof item === 'object' && Object.keys(item).length === 1 && 'index' in item) {
            return false; // Don't keep items that only have an index
        }
        return true;
      });
  }

  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('occ_') && Array.isArray(value)) {
      const filteredArray = filterAllEmptyFields(value);
      if (filteredArray.length > 0) {
        // Further check if array contains more than just {index: X} items
        const hasSubstantiveData = filteredArray.some(el => typeof el !== 'object' || Object.keys(el).length > 1 || !('index' in el) );
        if (hasSubstantiveData) {
            result[key] = filteredArray;
        }
        // We don't keep arrays of items that only have an index property anymore
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const filteredObject = filterAllEmptyFields(value);
      if (Object.keys(filteredObject).length > 0) {
        result[key] = filteredObject;
      }
    } else if (!isValueEmptyOrDefaultForFilter(value)) {
      result[key] = value;
    }
  }
  return result;
}


/**
 * Cleans parsed "vuelta" JSON.
 * - Ensures correct occurrence structure using occurrenceFixer.
 * - Optionally filters all empty/default fields.
 * @param {Object} parsedJson - The raw JSON object from messageAnalyzer.parseMessage.
 * @param {string} filterMode - 'aggressive' (filters all empty/default fields) or 'occurrencesOnly' (currently implies basic fixing).
 * @returns {Object} The cleaned JSON object.
 */
function cleanVueltaJson(parsedJson, filterMode = 'aggressive') {
  if (!parsedJson || typeof parsedJson !== 'object') {
    return parsedJson;
  }

  // First, ensure occurrence structure is fixed (indices, parentIds if they were present)
  // The fixer works on a full serviceStructure like object, so we wrap parsedJson.
  // Assuming parsedJson here is the 'data' part of a typical response.
  let dataToClean = parsedJson;
  if (parsedJson.hasOwnProperty('header') && parsedJson.hasOwnProperty('data')) { // If it's a full {header, data} object
    const fixedServiceData = occurrenceFixer.fixOccurrenceIndices({ response: parsedJson.data }).response;
    dataToClean = { header: parsedJson.header, data: fixedServiceData };
  } else { // If it's just the data part
     dataToClean = occurrenceFixer.fixOccurrenceIndices({ response: parsedJson }).response;
  }

  // Create a custom filter function that only cleans occurrence arrays but preserves other fields
  function filterOccurrencesOnly(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    if (Array.isArray(data)) {
      return data
        .map(item => filterOccurrencesOnly(item))
        .filter(item => {
          if (item === null || item === undefined) return false;
          if (typeof item === 'object' && Object.keys(item).length === 0) return false;
          // We should NOT keep items that only have an 'index' property
          if (typeof item === 'object' && Object.keys(item).length === 1 && 'index' in item) {
              return false; // Don't keep items that only have an index
          }
          return true;
        });
    }
    
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('occ_') && Array.isArray(value)) {
        // Process occurrence arrays
        const filteredArray = filterOccurrencesOnly(value);
        if (filteredArray.length > 0) {
          const hasSubstantiveData = filteredArray.some(el => 
            typeof el !== 'object' || Object.keys(el).length > 1 || !('index' in el));
          if (hasSubstantiveData) {
            result[key] = filteredArray;
          }
        }
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Process nested objects
        const filteredObject = filterOccurrencesOnly(value);
        if (Object.keys(filteredObject).length > 0) {
          result[key] = filteredObject;
        }
      } else {
        // Preserve all non-empty fields regardless of whether they're occurrences
        if (!isValueEmptyOrDefaultForFilter(value)) {
          result[key] = value;
        }
      }
    }
    return result;
  }

  if (filterMode === 'aggressive') {
    if (dataToClean.hasOwnProperty('header') && dataToClean.hasOwnProperty('data')) {
      return {
        header: dataToClean.header, // Header usually not filtered aggressively
        data: filterAllEmptyFields(dataToClean.data)
      };
    }
    return filterAllEmptyFields(dataToClean);
  }
  
  // Default (or 'occurrencesOnly' mode for now just returns the fixed data)
  // More specific 'occurrencesOnly' filtering could be added here if needed,
  // similar to the old 'removeEmptyOccurrences' that focused on empty occ arrays.
  return dataToClean;
}

module.exports = {
  cleanVueltaJson,
  isValueEmptyOrDefaultForFilter, // Export for potential external use/testing
  filterAllEmptyFields // Export for potential external use/testing
};
