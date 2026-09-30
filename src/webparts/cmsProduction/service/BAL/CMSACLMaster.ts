import SPCRUDOPS from "../DAL/spcrudops";
import { ICmsProductionProps } from "../../components/ICmsProductionProps";

export interface IUserFieldInfo {
    Id: number;
    Title: string;
    EMail?: string;
}

export interface ICMSACLMaster {
    Id?: number;
    Title: string;
    Modified?: string;
    Created?: string;
    UserNameId?: number;
    UserName?: IUserFieldInfo;
    Role: string;
    UserType: string;
    AuthorId?: number;
    Author?: IUserFieldInfo;
    EditorId?: number;
    Editor?: IUserFieldInfo;
}

export interface ICMSACLMasterBAL {
    getAllCMSACLData(props: ICmsProductionProps): Promise<ICMSACLMaster[]>;
    getCMSACLDataByFilter(filters: string, orderby: { column: string, isAscending: boolean }, props: ICmsProductionProps): Promise<ICMSACLMaster[]>;
    getCMSACLDataById(itemId: number, props: ICmsProductionProps): Promise<ICMSACLMaster | null>;
    addCMSACLData(data: Partial<ICMSACLMaster>, props: ICmsProductionProps): Promise<any>;
    updateCMSACLData(itemId: number, data: Partial<ICMSACLMaster>, props: ICmsProductionProps): Promise<any>;
    deleteCMSACLData(itemId: number, props: ICmsProductionProps): Promise<any>;
    batchAddCMSACLData(data: Partial<ICMSACLMaster>[], props: ICmsProductionProps): Promise<any>;
    batchUpdateCMSACLData(data: ICMSACLMaster[], props: ICmsProductionProps): Promise<any>;
    batchDeleteCMSACLData(data: ICMSACLMaster[], props: ICmsProductionProps): Promise<any>;
}

class CMSACLMasterImpl implements ICMSACLMasterBAL {
    private readonly listName: string = "CMS_ACL";
    private readonly columns: string = "Id,Title,Modified,Created,UserName/Id,UserName/Title,UserName/EMail,Role,UserType,Author/Id,Author/Title,Editor/Id,Editor/Title";
    private readonly expand: string = "UserName,Author,Editor";

    async getAllCMSACLData(props: ICmsProductionProps): Promise<ICMSACLMaster[]> {
        const spOps = await SPCRUDOPS();
        return await spOps.getAllData(this.listName, this.columns, this.expand, "", { column: "Id", isAscending: true }, props);
    }

    async getCMSACLDataByFilter(filters: string, orderby: { column: string, isAscending: boolean }, props: ICmsProductionProps): Promise<ICMSACLMaster[]> {
        const spOps = await SPCRUDOPS();
        return await spOps.getAllData(this.listName, this.columns, this.expand, filters, orderby, props);
    }

    async getCMSACLDataById(itemId: number, props: ICmsProductionProps): Promise<ICMSACLMaster | null> {
        const spOps = await SPCRUDOPS();
        const filters = `Id eq ${itemId}`;
        const result = await spOps.getData(this.listName, this.columns, this.expand, filters, { column: "Id", isAscending: true }, props);
        return result && result.length > 0 ? result[0] : null;
    }

    async addCMSACLData(data: Partial<ICMSACLMaster>, props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.insertData(this.listName, data, props);
    }

    async updateCMSACLData(itemId: number, data: Partial<ICMSACLMaster>, props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.updateData(this.listName, itemId, data, props);
    }

    async deleteCMSACLData(itemId: number, props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.deleteData(this.listName, itemId, props);
    }

    async batchAddCMSACLData(data: Partial<ICMSACLMaster>[], props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.batchInsert(this.listName, data, props);
    }

    async batchUpdateCMSACLData(data: ICMSACLMaster[], props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.batchUpdate(this.listName, data, props);
    }

    async batchDeleteCMSACLData(data: ICMSACLMaster[], props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.batchDelete(this.listName, data, props);
    }
}

export default function CMSACLMaster(): Promise<ICMSACLMasterBAL> {
    return Promise.resolve(new CMSACLMasterImpl());
}