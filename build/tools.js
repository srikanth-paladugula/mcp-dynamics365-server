import { z } from "zod";
export function registerTools(server, d365) {
    // Register the "get-user-info" tool
    server.tool("get-user-info", "Get user info from Dynamics 365", {}, async () => {
        try {
            const response = await d365.makeWhoAmIRequest();
            return {
                content: [
                    {
                        type: "text",
                        text: `Hi ${response.FullName}, your user ID is ${response.UserId} and your business unit ID is ${response.BusinessUnitId}`,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}, please check your credentials and try again.`,
                    },
                ],
                isError: true,
            };
        }
    });
    // Register the "fetch-accounts" tool
    server.tool("fetch-accounts", "Fetch accounts from Dynamics 365", {}, async () => {
        try {
            const response = await d365.getAccounts();
            const accounts = JSON.stringify(response.value, null, 2);
            return {
                content: [
                    {
                        type: "text",
                        text: accounts,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}, please check your credentials and try again.`,
                    },
                ],
                isError: true,
            };
        }
    });
    // Register the "get-associated-opportunities" tool
    server.tool("get-associated-opportunities", "Fetch opportunities for a given account from Dynamics 365", { accountId: z.string() }, async (req) => {
        try {
            const response = await d365.getAssociatedOpportunities(req.accountId);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(response, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}, please check your input and try again.`,
                    },
                ],
                isError: true,
            };
        }
    });
    // Register the "create-account" tool
    server.tool("create-account", "Create a new account in Dynamics 365", { accountData: z.object({}) }, async (params) => {
        try {
            const { accountData } = params;
            const response = await d365.createAccount(accountData);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(response, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}, please check your input and try again.`,
                    },
                ],
                isError: true,
            };
        }
    });
    // Register the "update-account" tool
    server.tool("update-account", "Update an existing account in Dynamics 365", {
        accountId: z.string(),
        accountData: z.object({}),
    }, async (params) => {
        try {
            const { accountId, accountData } = params;
            const response = await d365.updateAccount(accountId, accountData);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(response, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}, please check your input and try again.`,
                    },
                ],
                isError: true,
            };
        }
    });
}
