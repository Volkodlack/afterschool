package fr.afterschool.app

import android.app.Activity
import android.os.CancellationSignal
import androidx.core.content.ContextCompat
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialManagerCallback
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import org.json.JSONObject

/** Native Google sign-in (Credential Manager). The ID token is handed to Firebase Auth in JS. */
object GoogleAuth {
    fun signIn(activity: Activity, webClientId: String, emit: (String) -> Unit) {
        fun fail(why: String) = emit("AS_native.onGoogle && AS_native.onGoogle(null, ${JSONObject.quote(why)})")
        if (webClientId.isEmpty()) { fail("ID client Web manquant dans firebase-config.js"); return }
        try {
            val option = GetSignInWithGoogleOption.Builder(webClientId).build()
            val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
            CredentialManager.create(activity).getCredentialAsync(activity, request, CancellationSignal(),
                ContextCompat.getMainExecutor(activity),
                object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
                    override fun onResult(result: GetCredentialResponse) {
                        val c = result.credential
                        if (c is CustomCredential && c.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                            val tok = GoogleIdTokenCredential.createFrom(c.data).idToken
                            emit("AS_native.onGoogle && AS_native.onGoogle(${JSONObject.quote(tok)}, null)")
                        } else fail("type d'identifiant inattendu")
                    }
                    override fun onError(e: GetCredentialException) {
                        if (e is GetCredentialCancellationException) fail("cancel") else fail(e.message ?: e.type)
                    }
                })
        } catch (e: Throwable) { fail(e.message ?: "erreur") }
    }
}
