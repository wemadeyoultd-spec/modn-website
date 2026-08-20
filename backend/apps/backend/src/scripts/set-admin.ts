import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Create or reset a Medusa admin user's password IN-CONTAINER.
 *
 * Passwords are hashed by the emailpass auth provider, so this must run through
 * Medusa's modules (never raw SQL). The docker entrypoint runs it on boot when
 * SET_ADMIN=true; set SET_ADMIN back to false once the password has been set.
 *
 * Credentials come from env (with safe defaults):
 *   ADMIN_EMAIL     (default admin@medusa.local)
 *   ADMIN_PASSWORD  (default 1212)
 *
 * Behaviour:
 *   - user exists            -> reset the emailpass password to ADMIN_PASSWORD
 *   - user missing           -> register an emailpass identity + create the user
 *   - identity but no user   -> reset password, then create + link the user
 *
 * Run manually with:  npx medusa exec ./src/scripts/set-admin.ts
 */
export default async function setAdmin({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const userModule = container.resolve(Modules.USER)
  const authModule = container.resolve(Modules.AUTH)

  const email = process.env.ADMIN_EMAIL || "admin@medusa.local"
  const password = process.env.ADMIN_PASSWORD || "1212"

  logger.info(`[set-admin] Ensuring admin user ${email} with the supplied password...`)

  const users = await userModule.listUsers({ email })
  if (users.length > 0) {
    const res = await authModule.updateProvider("emailpass", {
      entity_id: email,
      password,
    })
    if (!res.success) {
      throw new Error(
        `[set-admin] Failed to reset password for ${email}: ${res.error}`
      )
    }
    logger.info(`[set-admin] Reset password for existing admin ${email}.`)
    return
  }

  // No user row yet — ensure an emailpass identity exists (create or claim),
  // then create the user account linked to that identity.
  let reg = await authModule.register("emailpass", {
    body: { email, password },
  })

  if (!reg.success || !reg.authIdentity) {
    // Identity likely already exists — update its password and look it up.
    const upd = await authModule.updateProvider("emailpass", {
      entity_id: email,
      password,
    })
    if (!upd.success) {
      throw new Error(
        `[set-admin] Could not register or update emailpass identity for ${email}: ${reg.error} / ${upd.error}`
      )
    }
    const identities = await authModule.listAuthIdentities(
      { provider_identities: { entity_id: email, provider: "emailpass" } },
      { relations: ["provider_identities"] }
    )
    if (!identities.length) {
      throw new Error(
        `[set-admin] No emailpass auth identity found for ${email} after update.`
      )
    }
    reg = { success: true, authIdentity: identities[0] }
  }

  const { result } = await createUserAccountWorkflow(container).run({
    input: {
      authIdentityId: reg.authIdentity!.id,
      userData: { email },
    },
  })

  logger.info(`[set-admin] Created admin user ${result.id} (${email}).`)
}
