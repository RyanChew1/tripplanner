import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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

export async function getUserById(id: string) {
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

export async function updateUser(user: User) {
    try {
    const docRef = doc(db, "users", user.id!);
    await updateDoc(docRef, {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        tier: user.tier,
        image: user.image,
        });
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