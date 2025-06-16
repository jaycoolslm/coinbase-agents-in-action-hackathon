import {
  Client,
  AccountId,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicId,
  Hbar,
  Status,
  CustomFixedFee,
} from "@hashgraph/sdk";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export interface HederaConfig {
  operatorId: string;
  operatorKey: string;
  network?: "testnet" | "mainnet";
  directoryTopicId?: string;
}

/**
 * Hedera Client wrapper for common operations
 */
export class HederaClientWrapper {
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;
  private directoryTopicId?: TopicId;

  constructor(config: HederaConfig) {
    this.operatorId = AccountId.fromString(config.operatorId);
    this.operatorKey = PrivateKey.fromStringECDSA(config.operatorKey);

    // Initialize client based on network
    if (config.network === "mainnet") {
      this.client = Client.forMainnet();
    } else {
      this.client = Client.forTestnet();
    }

    // Set operator
    this.client.setOperator(this.operatorId, this.operatorKey);

    // Set directory topic ID if provided
    if (config.directoryTopicId) {
      this.directoryTopicId = TopicId.fromString(config.directoryTopicId);
    }
  }

  /**
   * Create a new topic with optional submit key restriction and custom fees
   */
  async createTopic(
    options: {
      memo?: string;
      submitKeyRequired?: boolean;
      customFeeHbar?: number;
      feeCollectorAccountId?: AccountId;
    } = {}
  ): Promise<TopicId> {
    const transaction = new TopicCreateTransaction();

    if (options.memo) {
      transaction.setTopicMemo(options.memo);
    }

    // If submit key is required, restrict to operator
    if (options.submitKeyRequired) {
      transaction.setSubmitKey(this.operatorKey.publicKey);
    }

    // Add custom HBAR fee if specified (HIP-991)
    if (options.customFeeHbar && options.customFeeHbar > 0) {
      const customFee = new CustomFixedFee()
        .setHbarAmount(new Hbar(options.customFeeHbar))
        .setFeeCollectorAccountId(
          options.feeCollectorAccountId || this.operatorId
        );

      transaction.setCustomFees([customFee]);
    }

    const response = await transaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);

    if (receipt.status !== Status.Success) {
      throw new Error(`Topic creation failed with status: ${receipt.status}`);
    }

    if (!receipt.topicId) {
      throw new Error("Topic creation succeeded but no topic ID returned");
    }

    return receipt.topicId;
  }

  /**
   * Submit a message to a topic
   */
  async submitMessage(options: {
    topicId: TopicId;
    message: string | object;
    maxTransactionFee?: Hbar;
  }): Promise<void> {
    const messageContent =
      typeof options.message === "string"
        ? options.message
        : JSON.stringify(options.message);

    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(options.topicId)
      .setMessage(messageContent);

    // Set max transaction fee if specified (this is different from custom topic fees)
    if (options.maxTransactionFee) {
      transaction.setMaxTransactionFee(options.maxTransactionFee);
    }

    const response = await transaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);

    if (receipt.status !== Status.Success) {
      throw new Error(
        `Message submission failed with status: ${receipt.status}`
      );
    }
  }

  /**
   * Submit a directory entry to the directory topic with 10 HBAR max transaction fee
   */
  async submitDirectoryEntry(entry: object): Promise<void> {
    if (!this.directoryTopicId) {
      throw new Error("Directory topic ID not configured");
    }

    await this.submitMessage({
      topicId: this.directoryTopicId,
      message: entry,
      maxTransactionFee: new Hbar(10), // Set high max fee to cover custom topic fees
    });
  }

  /**
   * Create a pointer topic with submit key restricted to operator
   */
  async createPointerTopic(
    options: {
      memo?: string;
      customFeeHbar?: number;
    } = {}
  ): Promise<TopicId> {
    return this.createTopic({
      memo: options.memo || "Pointer topic for API pricing",
      submitKeyRequired: true, // Always restrict submit key for pointer topics
      customFeeHbar: options.customFeeHbar,
      feeCollectorAccountId: this.operatorId,
    });
  }

  /**
   * Submit a price update message to a pointer topic
   */
  async submitPriceUpdate(
    pointerTopicId: TopicId,
    priceMessage: object
  ): Promise<void> {
    await this.submitMessage({
      topicId: pointerTopicId,
      message: priceMessage,
    });
  }

  /**
   * Close the client connection
   */
  close(): void {
    this.client.close();
  }
}

/**
 * Factory function to create HederaClientWrapper from environment variables
 */
export function createHederaClient(): HederaClientWrapper {
  const operatorId = process.env.OPERATOR_ID;
  const operatorKey = process.env.OPERATOR_KEY;
  const network =
    (process.env.HEDERA_NETWORK as "testnet" | "mainnet") || "testnet";
  const directoryTopicId = process.env.DIRECTORY_TOPIC_ID;

  if (!operatorId || !operatorKey) {
    throw new Error(
      "Missing required environment variables: OPERATOR_ID and OPERATOR_KEY must be set"
    );
  }

  return new HederaClientWrapper({
    operatorId,
    operatorKey,
    network,
    directoryTopicId,
  });
}
