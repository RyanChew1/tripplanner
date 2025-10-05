import { deleteDoc, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "./firebase";
import { User } from "../types/users";

export async function createUser(user: User) {
    try {
        const docRef = doc(db, "users", user.id!);
        await setDoc(docRef, user);
    } catch (error) {
        console.error("Error creating user", error);
        throw error;
    }
}

// Get user data without validation (to prevent infinite loops)
async function getUserByIdRaw(id: string): Promise<User | null> {
    try {
        const docRef = doc(db, "users", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as User;
        }
        return null;
    } catch (error) {
        console.error("Error getting user by id", error);
        throw error;
    }
}

export async function getUserById(id: string): Promise<User | null> {
    try {
        const user = await getUserByIdRaw(id);
        if (!user) return null;
        
        return user;
    } catch (error) {
        console.error("Error getting user by id", error);
        throw error;
    }
}

export async function getUserByEmail(email: string): Promise<User | null> {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const user = { id: userDoc.id, ...userDoc.data() } as User;
            
            // If user has a subscription ID, validate it automatically
            if (user.subscriptionId) {
                console.log(`🔍 Auto-validating subscription for user ${user.id} (subscription: ${user.subscriptionId})`);
                const validatedUser: User | null = await validateUserSubscription(user.id!);
                return validatedUser || user;
            }
            
            return user;
        }
        return null;
    } catch (error) {
        console.error("Error getting user by email", error);
        throw error;
    }
}

export async function updateUser(user: User) {
    try {
        const docRef = doc(db, "users", user.id!);
        
        // Filter out undefined values to avoid Firebase errors
        const updateData: Record<string, string | number | boolean | object> = {};
        if (user.firstName !== undefined) updateData.firstName = user.firstName;
        if (user.lastName !== undefined) updateData.lastName = user.lastName;
        if (user.email !== undefined) updateData.email = user.email;
        if (user.tier !== undefined) updateData.tier = user.tier;
        if (user.image !== undefined) updateData.image = user.image;
        if (user.stripeCustomerId !== undefined) updateData.stripeCustomerId = user.stripeCustomerId;
        if (user.subscriptionId !== undefined) updateData.subscriptionId = user.subscriptionId;
        
        await updateDoc(docRef, updateData);
        return getUserById(user.id!);
    } catch (error) {
        console.error("Error updating user", error);
        throw error;
    }
}

export async function deleteUser(id: string) {
    try {
        const docRef = doc(db, "users", id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting user", error);
        throw error;
    }
}


export async function addPinnedGroup(userId: string, groupId: string) {
    try {
        const docRef = doc(db, "users", userId);
        await updateDoc(docRef, {
            pinnedGroups: arrayUnion(groupId)
        });
    } catch (error) {
        console.error("Error adding pinned group", error);
        throw error;
    }
}

export async function removePinnedGroup(userId: string, groupId: string) {

    try {
        const docRef = doc(db, "users", userId);
        await updateDoc(docRef, {
            pinnedGroups: arrayRemove(groupId)
        });
    } catch (error) {
        console.error("Error removing pinned group", error);
        throw error;
    }
}

export async function reorderPinnedGroups(userId: string, groupIds: string[]) {
    try {
        const docRef = doc(db, "users", userId);
        await updateDoc(docRef, {
            pinnedGroups: groupIds
        });
    } catch (error) {
        console.error("Error reordering pinned groups", error);
        throw error;
    }
}

export async function updateUserTier(userId: string, tier: "free" | "premium") {
    try {
        console.log(`🔄 Updating user ${userId} tier to ${tier}`);
        const docRef = doc(db, "users", userId);
        await updateDoc(docRef, {
            tier: tier,
            updatedAt: {
                seconds: Math.floor(Date.now() / 1000),
                nanoseconds: 0
            }
        });
        console.log(`✅ Successfully updated user ${userId} tier to ${tier}`);
        const updatedUser = await getUserById(userId);
        console.log(`📊 Updated user data:`, { id: updatedUser?.id, tier: updatedUser?.tier });
        return updatedUser;
    } catch (error) {
        console.error(`❌ Error updating user ${userId} tier to ${tier}:`, error);
        throw error;
    }
}

export async function updateStripeCustomerId(userId: string, stripeCustomerId: string) {
    try {
        const docRef = doc(db, "users", userId);
        await updateDoc(docRef, {
            stripeCustomerId: stripeCustomerId,
            updatedAt: {
                seconds: Math.floor(Date.now() / 1000),
                nanoseconds: 0
            }
        });
        return getUserById(userId);
    } catch (error) {
        console.error("Error updating Stripe customer ID", error);
        throw error;
    }
}

export async function updateSubscriptionId(userId: string, subscriptionId: string) {
    try {
        const docRef = doc(db, "users", userId);
        await updateDoc(docRef, {
            subscriptionId: subscriptionId,
            updatedAt: {
                seconds: Math.floor(Date.now() / 1000),
                nanoseconds: 0
            }
        });
        return getUserById(userId);
    } catch (error) {
        console.error("Error updating subscription ID", error);
        throw error;
    }
}

// Validate and sync user subscription status
export async function validateUserSubscription(userId: string): Promise<User | null> {
    try {
        console.log(`🔍 Validating subscription for user ${userId}`);
        
        // Get user data without validation to prevent infinite loop
        const user: User | null = await getUserByIdRaw(userId);
        if (!user) {
            console.log(`❌ User ${userId} not found`);
            return null;
        }

        // If user has no subscription ID, check if they should be free
        if (!user.subscriptionId) {
            if (user.tier === 'premium') {
                console.log(`🔄 User ${userId} has premium tier but no subscription - downgrading to free`);
                await updateUserTier(userId, 'free');
                return { ...user, tier: 'free' };
            }
            console.log(`✅ User ${userId} correctly set as free tier`);
            return user;
        }

        // Check subscription status with Stripe
        const { stripe } = await import('./stripeService');
        if (!stripe) {
            console.error('❌ Stripe not configured');
            return user;
        }

        try {
            const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);
            const isActive = subscription.status === 'active' || subscription.status === 'trialing';
            
            console.log(`📊 Subscription status for user ${userId}:`, {
                subscriptionId: user.subscriptionId,
                status: subscription.status,
                isActive,
                currentTier: user.tier
            });

            // If subscription is active but user is free tier
            if (isActive && user.tier === 'free') {
                console.log(`🔄 User ${userId} has active subscription but free tier - upgrading to premium`);
                await updateUserTier(userId, 'premium');
                return { ...user, tier: 'premium' };
            }

            // If subscription is not active but user is premium tier
            if (!isActive && user.tier === 'premium') {
                console.log(`🔄 User ${userId} has inactive subscription but premium tier - downgrading to free`);
                await updateUserTier(userId, 'free');
                return { ...user, tier: 'free' };
            }

            console.log(`✅ User ${userId} subscription status is correct`);
            return user;

        } catch (stripeError) {
            console.error(`❌ Error checking subscription ${user.subscriptionId} for user ${userId}:`, stripeError);
            
            // If subscription doesn't exist in Stripe but user has premium tier
            if (user.tier === 'premium') {
                console.log(`🔄 User ${userId} has premium tier but invalid subscription - downgrading to free`);
                await updateUserTier(userId, 'free');
                return { ...user, tier: 'free' };
            }
            
            return user;
        }

    } catch (error) {
        console.error(`❌ Error validating subscription for user ${userId}:`, error);
        return null;
    }
}