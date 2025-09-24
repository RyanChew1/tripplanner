import { doc, getDoc, setDoc, updateDoc, serverTimestamp, deleteDoc, arrayUnion, addDoc, collection, getDocs, where, query, or } from "firebase/firestore";
import { db } from "./firebase";
import { Group } from "../types/groups";

export async function getGroupById(id: string) {
    try {
    const docRef = doc(db, "groups", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as Group;
        }
        return null;
    } catch (error) {
        console.error("Error getting group by id", error);
        throw error;
    }
}

// Get all groups that a user is a member of
export async function getUserGroups(userId: string) {
    const roles = ["manager", "admin", "traveler"];
    const groupsRef = collection(db, "groups");
  
    // Firestore supports `in` for up to 10 values
    const q = query(
      groupsRef,
      where(`groupMembers.${userId}`, "in", roles)
    );
  
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Group[];
  }


export async function createGroup(group: Group) {
    try {
        const docRef = collection(db, "groups");
        await addDoc(docRef, {...group, createdAt: serverTimestamp(), updatedAt: serverTimestamp()});
        return getGroupById(docRef.id);
    } catch (error) {
        console.error("Error creating group", error);
        throw error;
    }
}

export async function updateGroup(group: Group) {
    try {
        const docRef = doc(db, "groups", group.id!);
        await updateDoc(docRef, {...group, updatedAt: serverTimestamp()});
        return getGroupById(group.id!);
    } catch (error) {
        console.error("Error updating group", error);
        throw error;
    }
}

export async function deleteGroup(id: string) {
    try {
        const docRef = doc(db, "groups", id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting group", error);
        throw error;
    }
}

export async function addUserToGroup(groupId: string, userId: string) {
    try {
        const docRef = doc(db, "groups", groupId);
        await updateDoc(docRef, {
            memberIds: arrayUnion(userId),
        });
    } catch (error) {
        console.error("Error adding user to group", error);
        throw error;
    }
}