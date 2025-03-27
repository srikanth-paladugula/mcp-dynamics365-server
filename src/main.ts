/**
 * Functions for Dynamics 365 authentication and user identity
 */

// Import required types
import {
  Configuration,
  ConfidentialClientApplication,
  ClientCredentialRequest,
} from "@azure/msal-node";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export class Dynamics365 {
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;
  private d365Url: string;
  private msalInstance: ConfidentialClientApplication;

  /**
   * @param clientId - Azure AD application client ID
   * @param clientSecret - Azure AD application client secret
   * @param tenantId - Azure AD tenant ID
   * @param d365Url - Dynamics 365 instance URL (e.g., https://your-org.crm.dynamics.com)
   */
  constructor(
    clientId: string,
    clientSecret: string,
    tenantId: string,
    d365Url: string
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.tenantId = tenantId;
    this.d365Url = d365Url;

    // Configure MSAL
    const msalConfig: Configuration = {
      auth: {
        clientId: this.clientId,
        authority: `https://login.microsoftonline.com/${this.tenantId}`,
        clientSecret: this.clientSecret,
      },
    };

    // Initialize MSAL client
    this.msalInstance = new ConfidentialClientApplication(msalConfig);
  }

  /**
   * @returns Promise resolving to authentication result with token
   */
  private async authenticate(): Promise<string> {
    const tokenRequest: ClientCredentialRequest = {
      scopes: [`${new URL(this.d365Url).origin}/.default`],
    };

    try {
      const response = await this.msalInstance.acquireTokenByClientCredential(
        tokenRequest
      );
      if (response && response.accessToken) {
        return response.accessToken;
      } else {
        throw new Error(
          "Token acquisition failed: response is null or invalid."
        );
      }
    } catch (error) {
      console.error("Token acquisition failed:", error);
      throw new Error(
        `Failed to authenticate with Dynamics 365: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Makes an API request to Dynamics 365
   * @param endpoint - The API endpoint (relative to the base URL)
   * @param method - The HTTP method (e.g., "GET", "POST")
   * @param body - The request body (optional, for POST/PUT requests)
   * @param additionalHeaders - Additional headers to include in the request
   * @returns Promise resolving to the API response
   */
  private async makeApiRequest(
    endpoint: string,
    method: string,
    body?: any,
    additionalHeaders?: Record<string, string>
  ): Promise<any> {
    const token = await this.authenticate();
    const baseUrl = this.d365Url.endsWith("/")
      ? this.d365Url
      : `${this.d365Url}/`;
    const url = `${baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      ...additionalHeaders,
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(
          `API request failed with status: ${
            response.status
          }, message: ${await response.text()}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API request to ${url} failed:`, error);
      throw new Error(
        `Failed to make API request: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Makes a WhoAmI request to Dynamics 365 to get information about the currently logged-in user
   * @returns Promise resolving to the user's information
   */
  public async makeWhoAmIRequest(): Promise<{
    BusinessUnitId: string;
    UserId: string;
    OrganizationId: string;
    UserName?: string;
    FullName?: string;
  }> {
    const data = await this.makeApiRequest("api/data/v9.2/WhoAmI", "GET");

    // If we want to get more details about the user, we can make an additional request
    if (data && data.UserId) {
      const userDetails = await this.makeApiRequest(
        `api/data/v9.2/systemusers(${data.UserId})`,
        "GET",
        undefined,
        { Prefer: 'odata.include-annotations="*"' }
      );
      data.UserName = userDetails.domainname;
      data.FullName = userDetails.fullname;
    }

    return data;
  }

  /**
   * Fetches accounts from Dynamics 365
   * @returns Promise resolving to the list of accounts
   */
  public async getAccounts(): Promise<any> {
    return this.makeApiRequest("api/data/v9.2/accounts", "GET");
  }

  /**
   * Fetches contacts for a given account from Dynamics 365
   * @param accountId - The ID of the account for which to retrieve contacts
   * @returns Promise resolving to the list of contacts
   */
  public async getAssociatedContacts(accountId: string): Promise<any> {
    if (!accountId) {
      throw new Error("Account ID is required to fetch contacts.");
    }

    const endpoint = `api/data/v9.2/contacts?$filter=_parentcustomerid_value eq ${accountId}`;
    return this.makeApiRequest(endpoint, "GET");
  }
  /**
   * Fetches opportunities for a given account from Dynamics 365
   * @param accountId - The ID of the account for which to retrieve opportunities
   * @returns Promise resolving to the list of opportunities
   */
  public async getAssociatedOpportunities(accountId: string): Promise<any> {
    if (!accountId) {
      throw new Error("Account ID is required to fetch opportunities.");
    }

    const endpoint = `api/data/v9.2/opportunities?$filter=_customerid_value eq ${accountId}`;
    return this.makeApiRequest(endpoint, "GET");
  }
  /* create a new account in Dynamics 365
   * @param accountData - The data for the new account
   * @returns Promise resolving to the created account
   */
  public async createAccount(accountData: any): Promise<any> {
    if (!accountData) {
      throw new Error("Account data is required to create an account.");
    }

    const endpoint = "api/data/v9.2/accounts";
    return this.makeApiRequest(endpoint, "POST", accountData);
  }

  /**
   * Updates an existing account in Dynamics 365
   * @param accountId - The ID of the account to update
   * @param accountData - The updated data for the account
   * @returns Promise resolving to the updated account
   */
  public async updateAccount(
    accountId: string,
    accountData: any
  ): Promise<any> {
    if (!accountId) {
      throw new Error("Account ID is required to update an account.");
    }

    if (!accountData) {
      throw new Error("Account data is required to update an account.");
    }

    const endpoint = `api/data/v9.2/accounts(${accountId})`;
    return this.makeApiRequest(endpoint, "PATCH", accountData);
  }
}
