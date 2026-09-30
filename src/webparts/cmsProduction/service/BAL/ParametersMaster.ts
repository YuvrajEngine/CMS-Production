import SPCRUDOPS from "../DAL/spcrudops";
import { ICmsProductionProps } from "../../components/ICmsProductionProps";

export interface IUserFieldInfo {
    Id: number;
    Title: string;
    EMail?: string;
}

export interface IParametersMaster {
    Id?: number;
    Title: string;
    Details: string;
    Modified?: string;
    Created?: string;
    AuthorId?: number;
    Author?: IUserFieldInfo;
    EditorId?: number;
    Editor?: IUserFieldInfo;
}

export interface IParametersMasterBAL {
    getAllParametersData(props: ICmsProductionProps): Promise<IParametersMaster[]>;
    getParametersDataByFilter(filters: string, orderby: { column: string, isAscending: boolean }, props: ICmsProductionProps): Promise<IParametersMaster[]>;
    getParametersDataById(itemId: number, props: ICmsProductionProps): Promise<IParametersMaster | null>;
    addParametersData(data: Partial<IParametersMaster>, props: ICmsProductionProps): Promise<any>;
    updateParametersData(itemId: number, data: Partial<IParametersMaster>, props: ICmsProductionProps): Promise<any>;
    deleteParametersData(itemId: number, props: ICmsProductionProps): Promise<any>;
    batchAddParametersData(data: Partial<IParametersMaster>[], props: ICmsProductionProps): Promise<any>;
    batchUpdateParametersData(data: IParametersMaster[], props: ICmsProductionProps): Promise<any>;
    batchDeleteParametersData(data: IParametersMaster[], props: ICmsProductionProps): Promise<any>;
}

class ParametersMasterImpl implements IParametersMasterBAL {
    private readonly listName: string = "Parameters";
    private readonly columns: string = "Id,Title,Details,Modified,Created,Author/Id,Author/Title,Editor/Id,Editor/Title";
    private readonly expand: string = "Author,Editor";

    async getAllParametersData(props: ICmsProductionProps): Promise<IParametersMaster[]> {
        const spOps = await SPCRUDOPS();
        return await spOps.getAllData(this.listName, this.columns, this.expand, "", { column: "Id", isAscending: true }, props);
    }

    async getParametersDataByFilter(filters: string, orderby: { column: string, isAscending: boolean }, props: ICmsProductionProps): Promise<IParametersMaster[]> {
        const spOps = await SPCRUDOPS();
        return await spOps.getAllData(this.listName, this.columns, this.expand, filters, orderby, props);
    }

    async getParametersDataById(itemId: number, props: ICmsProductionProps): Promise<IParametersMaster | null> {
        const spOps = await SPCRUDOPS();
        const filters = `Id eq ${itemId}`;
        const result = await spOps.getData(this.listName, this.columns, this.expand, filters, { column: "Id", isAscending: true }, props);
        return result && result.length > 0 ? result[0] : null;
    }

    async addParametersData(data: Partial<IParametersMaster>, props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.insertData(this.listName, data, props);
    }

    async updateParametersData(itemId: number, data: Partial<IParametersMaster>, props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.updateData(this.listName, itemId, data, props);
    }

    async deleteParametersData(itemId: number, props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.deleteData(this.listName, itemId, props);
    }

    async batchAddParametersData(data: Partial<IParametersMaster>[], props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.batchInsert(this.listName, data, props);
    }

    async batchUpdateParametersData(data: IParametersMaster[], props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.batchUpdate(this.listName, data, props);
    }

    async batchDeleteParametersData(data: IParametersMaster[], props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.batchDelete(this.listName, data, props);
    }
}

export default function ParametersMaster(): Promise<IParametersMasterBAL> {
    return Promise.resolve(new ParametersMasterImpl());
}