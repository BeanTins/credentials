import {UserPool, 
  AccountRecovery, 
  UserPoolClient, 
  UserPoolClientIdentityProvider, 
  ClientAttributes} from "@aws-cdk/aws-cognito"
import {Stack, App, StackProps, RemovalPolicy, CfnOutput} from "@aws-cdk/core"
import {StringParameter, ParameterType, ParameterTier} from "@aws-cdk/aws-ssm"

export enum StoreType
{
  Output,
  Parameter
}
interface MemberCredentialsProps extends StackProps {
  stageName: string
  storeTypeForSettings: StoreType
}

export class MemberCredentials extends Stack {
  public readonly userPoolId: string
  public readonly userPoolClientId: string
  public readonly userPoolArn: string

  constructor(scope: App, id: string, props: MemberCredentialsProps) {
    super(scope, id, props)

    const userPool = this.buildUserPool(id, props.stageName, props.storeTypeForSettings)
    this.userPoolId = userPool.userPoolId
    this.userPoolArn = userPool.userPoolArn

    const client = this.buildUserPoolClient(userPool, props.stageName, props.storeTypeForSettings)
    this.userPoolClientId = client.userPoolClientId
  }

  private buildUserPool(id: string, stageName: string, storeType: StoreType) {
    const userPool = new UserPool(this, 'MemberCredentials', {
      selfSignUpEnabled: true,
      // signInAliases: {
      //   email: true,
      // },
      // autoVerify: {
      //   email: false,
      // },

      passwordPolicy: {
        minLength: 6,
        requireLowercase: true,
        requireDigits: true,
        requireUppercase: false,
        requireSymbols: false,
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    this.storeSetting("userPoolId" + stageName, 
                        "the member credentials Id for stage environment " + stageName,
                        userPool.userPoolId,
                        storeType)

    this.storeSetting("userPoolArn" + stageName, 
                        "the member credentials Arn for stage environment " + stageName,
                        userPool.userPoolArn,
                        storeType)

    return userPool
  }

  private storeSetting(name: string, description: string, value: string, storeType: StoreType) {
    if (storeType == StoreType.Parameter)
    {
      this.buildParameter(name, description, value)
    }
    else
    {
      new CfnOutput(this, name, {
        description: description,
        value: value,
        exportName: name
      })
    }
  }

  private buildParameter(name: string, description: string, value: string) {

    return new StringParameter(this, name, {
      parameterName: name,
      stringValue: value,
      description: description,
      type: ParameterType.STRING,
      tier: ParameterTier.STANDARD,
      allowedPattern: ".*",
    })
  }

  private buildUserPoolClient(userPool: UserPool, stageName: string, storeType: StoreType) {
    const standardCognitoAttributes = {
      email: true,
      emailVerified: true,
      locale: true,
      timezone: true,
      lastUpdateTime: true
    }
  
    const clientReadAttributes = new ClientAttributes()
      .withStandardAttributes(standardCognitoAttributes)
  
    const clientWriteAttributes = new ClientAttributes()
      .withStandardAttributes({
        ...standardCognitoAttributes,
        emailVerified: false,
      })
  
    const userPoolClient = new UserPoolClient(this, 'MemberCredentialsClient', {
      userPool,
      authFlows: {
        adminUserPassword: true,
        custom: true,
        userSrp: true,
      },
      supportedIdentityProviders: [
        UserPoolClientIdentityProvider.COGNITO,
      ],
      readAttributes: clientReadAttributes,
      writeAttributes: clientWriteAttributes,
    })
  
    this.storeSetting("userPoolClientId" + stageName, 
                      "the member credentials client Id for stage environment " + stageName,
                      userPoolClient.userPoolClientId,
                      storeType)

    return userPoolClient
  }

}
