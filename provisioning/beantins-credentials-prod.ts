
import "source-map-support/register"
import {App} from "aws-cdk-lib"
import { BeanTinsCredentials, StoreType } from "../infrastructure/beantins-credentials"

const app = new App()
new BeanTinsCredentials(app, "BeanTinsCredentials", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  deploymentName: "BeanTins",
  storeTypeForSettings: StoreType.Parameter
})

app.synth()