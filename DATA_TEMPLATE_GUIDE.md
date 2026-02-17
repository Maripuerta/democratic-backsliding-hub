# DATA Template Guide

## Instructions for Populating `countryData.json`

This guide provides comprehensive instructions on how to populate the `countryData.json` file using data from V-Dem, ERT, BTI, and DEED for all 24 Latin American countries. 

### Countries Included
1. Argentina
2. Bolivia
3. Brazil
4. Chile
5. Colombia
6. Costa Rica
7. Cuba
8. Dominican Republic
9. Ecuador
10. El Salvador
11. Guatemala
12. Haiti
13. Honduras
14. Mexico
15. Nicaragua
16. Panama
17. Paraguay
18. Peru
19. Uruguay
20. Venezuela
21. Jamaica
22. Trinidad and Tobago
23. Barbados
24. Suriname

### Data Sources
- **V-Dem**: Varieties of Democracy data provides multiple indicators for measuring democracy.
- **ERT**: The Economist Intelligence Unit Democracy Index.
- **BTI**: Bertelsmann Transformation Index, evaluating the quality of governance in developing countries.
- **DEED**: Democracy, Equity, and Development dataset covering various aspects of democratic governance.

### Steps to Populate `countryData.json`
1. **Data Collection**:
   - Access the respective datasets from V-Dem, ERT, BTI, and DEED.
   - Ensure you are using the most recent and relevant datasets for the respective countries.

2. **Data Formatting**:
   - Follow the required JSON structure for `countryData.json`. 
   - Example format:
     ```json
     {
       "country": "Country Name",
       "vdem": {},
       "ert": {},
       "bti": {},
       "deed": {}
     }
     ```
   - Replace the placeholders with actual data from the datasets.

3. **Data Verification**:
   - Cross-check the populated data for accuracy and completeness.
   - Ensure that all 24 countries are included in the final version and that the data sources are accurately cited.

4. **Finalization**:
   - Save the final version of `countryData.json` in the root directory of the project.

### Example Entry
```json
{
  "country": "Argentina",
  "vdem": { ... },
  "ert": { ... },
  "bti": { ... },
  "deed": { ... }
}
``` 

### Further References
- [V-Dem Project](https://www.v-dem.net)
- [Economist Intelligence Unit](https://www.eiu.com)
- [Bertelsmann Transformation Index](https://www.bti-project.org)
- [DEED](https://www.deed-net.org)