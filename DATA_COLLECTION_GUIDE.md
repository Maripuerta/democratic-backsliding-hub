# Data Collection Guide

## Introduction
This guide provides step-by-step instructions for extracting and populating country data from the V-Dem, ERT, BTI, and DEED datasets for all 24 Latin American countries.

### Steps to Extract and Populate Data

#### 1. Setup Your Environment
   - Make sure you have Python installed (version 3.8 or higher).
   - Install necessary libraries:
     ```bash
     pip install pandas requests
     ```

#### 2. Download Datasets
   - **V-Dem Dataset**:
     - Go to [V-Dem Data Portal](https://www.v-dem.net/en/data/data-download/).
     - Select the country list and download the dataset.
   - **ERT Dataset**:
     - Access the ERT datasets on [ERT website](https://www.econ.ku.dk/ert/).
     - Choose the latest dataset for download.
   - **BTI Dataset**:
     - Visit [BTI website](https://www.bertelsmann-stiftung.de/en/publications/) and select the region.
     - Download the country reports.
   - **DEED Dataset**:
     - Find the DEED dataset on [DEED Platform](https://deed-platform.com/).
     - Download the data related to Latin America.

#### 3. Load the Datasets
   - Use the following Python script to load your datasets:
     ```python
     import pandas as pd

     vdem_data = pd.read_csv('path_to_vdem.csv')
     ert_data = pd.read_csv('path_to_ert.csv')
     bti_data = pd.read_csv('path_to_bti.csv')
     deed_data = pd.read_csv('path_to_deed.csv')
     ```

#### 4. Data Cleaning
   - Check for missing values and duplicates:
     ```python
     print(vdem_data.isnull().sum())
     print(vdem_data.duplicated().sum())
     ```
   - Fill or drop missing values as necessary:
     ```python
     vdem_data.fillna(0, inplace=True)
     ```

#### 5. Merging Datasets
   - Combine datasets based on country codes:
     ```python
     merged_data = pd.merge(vdem_data, ert_data, on='country_code')
     merged_data = pd.merge(merged_data, bti_data, on='country_code')
     merged_data = pd.merge(merged_data, deed_data, on='country_code')
     ```

#### 6. Saving the Cleaned Data
   - Finally, save the merged dataset:
     ```python
     merged_data.to_csv('final_latin_american_data.csv', index=False)
     ```

### Conclusion
Following these steps will help you extract and populate country data from the respective datasets for analysis and reporting.

## Appendix
- Links to datasets:
   - V-Dem: [link](https://www.v-dem.net/en/data/data-download/)
   - ERT: [link](https://www.econ.ku.dk/ert/)
   - BTI: [link](https://www.bertelsmann-stiftung.de/en/publications/)
   - DEED: [link](https://deed-platform.com/)